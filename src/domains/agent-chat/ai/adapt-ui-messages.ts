import type { ChatStatus } from 'ai';

import type { ChatMessage, ChatRole, ContentPart, StreamState } from '../types/chat.types';
import { chatErrorCodeFrom, resolveChatErrorMessage, CHAT_ERROR_CODES } from '../composables/services/chat/chat.e';

/**
 * @file src/domains/agent-chat/ai/adapt-ui-messages.ts
 * @description Traduce el vocabulario del AI SDK al vocabulario del dominio.
 *
 * Es el **único** módulo que conoce la forma de un `UIMessage`, y existe por la
 * misma razón que existía `translateChunk` para el transporte anterior: la UI, el
 * transcript y los componentes siguen hablando `ChatMessage`, así que cambiar de
 * versión del SDK (o de proveedor) es tocar un archivo, no reescribir la vista.
 *
 * Dos decisiones que no son de estilo:
 *
 *  1. **Se tipa por estructura, no importando `UIMessagePart`.** Igual que
 *     `translateChunk` declaraba la parte del chunk que realmente leía, aquí se
 *     declara la parte del mensaje que se usa. Importar la unión del SDK ataría
 *     este archivo a su versión justo donde se quiere ser agnóstico, y el SDK
 *     encaja por estructura sin ceder nada.
 *  2. **Lo que no se sabe pintar se descarta explícitamente** (`reasoning`,
 *     `data-*`, `source-*`, `file`, `step-start`), igual que el chunk
 *     desconocido se descartaba antes en vez de rebotarlo a la UI.
 *
 * Funciones puras a propósito: se prueban sin montar Vue, como `chat.memo.ts`.
 */

/** Vista estructural de una pieza del mensaje: solo lo que este módulo lee. */
interface WirePart {
  type: string;
  text?: string | undefined;
  toolName?: string | undefined;
  input?: unknown;
  output?: unknown;
  errorText?: unknown;
}

/** Lo mínimo que el adapter necesita de un mensaje del AI SDK. */
export interface WireMessage {
  id: string;
  role: string;
  parts: WirePart[];
}

export interface AdaptedTranscript {
  /** Globos cerrados. El mensaje en vuelo **no** entra aquí (ver `inFlight`). */
  messages: ChatMessage[];
  /** Texto del globo en vuelo, que la isla pinta fuera de la lista. */
  streamingText: string;
}

export interface AdaptOptions {
  /** ¿Hay una respuesta generándose? Entonces el último globo aún no cierra. */
  inFlight: boolean;
  /** Mensaje de error ya traducido por el catálogo, si la ejecución falló. */
  errorText?: string | undefined;
  /** El usuario detuvo la ejecución: el globo se marca como cancelado. */
  aborted?: boolean | undefined;
}

/** Marcas que se aplican a un globo cerrado; subconjunto de `AdaptOptions`. */
interface MessageMarks {
  errorText?: string | undefined;
  aborted?: boolean | undefined;
}

const TEXT = 'text';
const DYNAMIC_TOOL = 'dynamic-tool';
const TOOL_PREFIX = 'tool-';
/** Nombre de reserva: la UI nunca debe pintar un hueco vacío. */
const FALLBACK_TOOL_NAME = 'herramienta';
/** Id estable del globo sintético de error (es la `:key` de la lista). */
const ERROR_BUBBLE_ID = 'stream-error';

/**
 * Traduce la lista del AI SDK al transcript visible.
 *
 * **El mensaje en vuelo sale de la lista.** Mientras llegan deltas, su texto viaja
 * en `streamingText` y la lista no se toca: es la política que mantiene barato el
 * scroll durante un stream (`chat.memo.ts` memoriza los globos cerrados). El globo
 * en vuelo se identifica por ser el último mensaje **del asistente** y haber
 * ejecución en curso: durante `submitted` el último mensaje todavía es el del
 * usuario, que no debe desaparecer.
 */
export function adaptTranscript(ui: readonly WireMessage[], options: AdaptOptions): AdaptedTranscript {
  const lastAssistant = lastAssistantIndex(ui);
  const inFlightIndex = options.inFlight && lastAssistant === ui.length - 1 ? lastAssistant : -1;

  const messages: ChatMessage[] = [];
  let streamingText = '';
  let errorAttached = false;

  for (const [index, message] of ui.entries()) {
    if (index === inFlightIndex) {
      streamingText = messageText(message);
      continue;
    }
    if (index === lastAssistant && options.errorText !== undefined) errorAttached = true;
    messages.push(toChatMessage(message, index === lastAssistant ? options : {}));
  }

  // Un fallo puede llegar **sin** ningún globo del asistente: si el backend
  // rechaza antes de emitir un solo chunk, la lista termina en el mensaje del
  // usuario y el error no tendría dónde irse. Sin esta burbuja el usuario ve la
  // ejecución terminar en silencio, que es el peor de los desenlaces.
  if (options.errorText !== undefined && !errorAttached) {
    messages.push({
      id: ERROR_BUBBLE_ID,
      role: 'assistant',
      parts: [],
      createdAt: '',
      status: 'error',
      error: options.errorText,
    });
  }

  return { messages, streamingText };
}

/**
 * Longitud total del texto de una lista de mensajes.
 *
 * La usa el vigilante de silencio como señal de actividad: es lo único que cambia
 * de un chunk al siguiente, así que es lo que rearma su reloj.
 */
export function uiTextLength(ui: readonly WireMessage[]): number {
  let total = 0;
  for (const message of ui) total += messageText(message).length;
  return total;
}

/**
 * Estado del stream en el vocabulario del dominio.
 *
 * `stalled` no viene del SDK: el AI SDK se queda en `streaming` tanto si el agente
 * piensa como si el upstream se ha muerto, así que el silencio lo decide el
 * vigilante propio (`useStallWatchdog`).
 */
export function toStreamState(status: ChatStatus, stalled: boolean): StreamState {
  switch (status) {
    case 'submitted':
      return 'connecting';
    case 'streaming':
      return stalled ? 'stalled' : 'streaming';
    case 'error':
      return 'error';
    case 'ready':
      return 'idle';
  }
}

/**
 * Mensaje presentable para un fallo del stream.
 *
 * El texto que trae el SDK puede ser un interno del backend ("Processor workflow
 * …"), así que **nunca se pinta**: se registra fuera de aquí y a la pantalla va el
 * catálogo. El mock, para poder ejercitar el catálogo sin backend, emite el propio
 * código como texto del error.
 */
export function resolveStreamErrorText(error: Error): string {
  const code = chatErrorCodeFrom(error.message) ?? CHAT_ERROR_CODES.agentError;
  return resolveChatErrorMessage({ statusCode: 502, code });
}

function toChatMessage(message: WireMessage, marks: MessageMarks): ChatMessage {
  const parts = toContentParts(message.parts);
  const failed = marks.errorText !== undefined && message.role === 'assistant';
  const aborted = marks.aborted === true && message.role === 'assistant';

  // El AI SDK no transporta la hora de creación de cada mensaje (su `metadata` es
  // libre), así que un mensaje adaptado no tiene fecha. Nada la pinta hoy; si
  // algún día se necesita, es `metadata` en el servidor, no este campo.
  const base: ChatMessage = { id: message.id, role: toChatRole(message.role), parts, createdAt: '', status: 'done' };
  if (failed && marks.errorText !== undefined) return { ...base, status: 'error', error: marks.errorText };
  if (aborted) return { ...base, status: 'aborted', error: 'Respuesta cancelada.' };
  return base;
}

function toContentParts(parts: readonly WirePart[]): ContentPart[] {
  const out: ContentPart[] = [];

  for (const part of parts) {
    if (part.type === TEXT) {
      if (part.text !== undefined && part.text !== '') out.push({ type: 'text', text: part.text });
      continue;
    }

    const toolName = toolNameOf(part);
    if (toolName !== undefined) {
      // Un `tool-*` en estado de error no tiene `output`: lo que se puede enseñar
      // es su `errorText`. Los estados intermedios no tienen ninguno de los dos.
      const result = part.output !== undefined ? part.output : part.errorText;
      out.push({
        type: 'tool-call',
        toolName,
        args: part.input,
        ...(result !== undefined ? { result } : {}),
      });
    }
    // `reasoning`, `data-*`, `source-*`, `file`, `step-start`: sin equivalente en
    // el vocabulario del dominio todavía. Se descartan a propósito.
  }

  return out;
}

function toolNameOf(part: WirePart): string | undefined {
  if (part.type === DYNAMIC_TOOL) return part.toolName ?? FALLBACK_TOOL_NAME;
  if (part.type.startsWith(TOOL_PREFIX)) return part.type.slice(TOOL_PREFIX.length) || FALLBACK_TOOL_NAME;
  return undefined;
}

/** Texto plano de un mensaje: sus piezas de texto concatenadas. */
export function messageText(message: WireMessage): string {
  return message.parts
    .filter((part) => part.type === TEXT && part.text !== undefined)
    .map((part) => part.text ?? '')
    .join('');
}

function lastAssistantIndex(ui: readonly WireMessage[]): number {
  for (let index = ui.length - 1; index >= 0; index -= 1) {
    if (ui[index]?.role === 'assistant') return index;
  }
  return -1;
}

function toChatRole(role: string): ChatRole {
  return role === 'user' || role === 'system' ? role : 'assistant';
}
