import type { UIMessageChunk } from 'ai';

import { STREAM_STALL_MS } from '@config/app';
import { CHAT_ERROR_CODES } from '../composables/services/chat/chat.e';

/**
 * @file src/domains/agent-chat/ai/mock-script.ts
 * @description Guion del transporte simulado, ya en el vocabulario del AI SDK.
 *
 * No es un `setTimeout` imprimiendo texto: imita las cosas que rompen un chat y
 * que por tanto hay que poder ejercitar sin backend —
 *
 *  - deltas de tamaño irregular (así llegan los modelos reales, palabra a palabra);
 *  - una herramienta en medio, para que `ToolCallCard` se vea alguna vez;
 *  - `/error` → chunk de error con un código del catálogo, para recorrer el camino
 *    de error completo (el adapter lo traduce, nunca se pinta un interno);
 *  - `/slow` → silencio real más largo que `STREAM_STALL_MS`, para provocar el
 *    estado `stalled` igual que lo haría un agente de verdad callado.
 *
 * El reloj del guion está en el transporte (`chat.transport.mock.ts`), que es
 * quien respeta el `abortSignal`; aquí solo se declara QUÉ se emite.
 */

const SENTENCE_BANK: Record<string, string> = {
  default:
    'Este es un flujo simulado del boilerplate. Sirve para desarrollar la interfaz de chat sin levantar ningún backend: los deltas llegan en trozos irregulares, como lo hacen los modelos reales, y el transcript se alimenta por frame de pantalla.',
  research:
    'Como agente de investigación simulado, diría que el diseño de este boilerplate separa tres capas: el transporte que habla con el proveedor, el BFF que reenvía el stream sin tocarlo, y la isla que solo conoce un contrato de chunks.',
  tasks:
    'Agente de tareas simulado: puedo descomponer un objetivo en pasos. Paso 1, definir el resultado esperado. Paso 2, listar las dependencias. Paso 3, ejecutar y reportar desviaciones.',
};

/** Chunks por segundo simulados. Bajo para poder ver el efecto. */
const CHUNKS_PER_SECOND = 18;
const BASE_MS = Math.round(1000 / CHUNKS_PER_SECOND);
/** Una llamada a herramienta tarda más: en la UI se tiene que notar. */
const TOOL_MS = BASE_MS * 3;

const TEXT_ID = 'mock-text';
const TOOL_CALL_ID = 'mock-tool';
const TOOL_NAME = 'buscar_documentacion';

/**
 * Id de mensaje del guion, único por ejecución.
 *
 * El `start` no es decorativo: es el chunk que **abre** el mensaje del asistente y
 * el que le da su id. Sin él la UI recibe un mensaje con id vacío, y ese id es la
 * `:key` de la lista del transcript: dos respuestas seguidas compartirían clave y
 * Vue reutilizaría el nodo equivocado.
 */
let messageSequence = 0;
function nextMessageId(): string {
  messageSequence += 1;
  return `mock-message-${messageSequence}`;
}

/** Plan de silencio: tras emitir `after` chunks, callar `ms` milisegundos. */
export interface MockStall {
  after: number;
  ms: number;
}

/** `/slow` → silencio más largo que el watchdog del cliente. Otro prompt → nada. */
export function stallFor(prompt: string): MockStall | undefined {
  if (!prompt.trim().toLowerCase().startsWith('/slow')) return undefined;
  return { after: 2, ms: STREAM_STALL_MS + 2_000 };
}

/** Secuencia de chunks que respondería un agente para `prompt`. */
export function answerFor(agentId: string, prompt: string): UIMessageChunk[] {
  const start: UIMessageChunk = { type: 'start', messageId: nextMessageId() };

  if (prompt.trim().toLowerCase().startsWith('/error')) {
    // El mock emite el CÓDIGO como texto del error: es lo que permite que el
    // adapter lo traduzca con el catálogo y que el camino de fallo se ejercite
    // sin backend, que es justo para lo que existe el transporte simulado.
    return [start, { type: 'error', errorText: CHAT_ERROR_CODES.upstreamUnreachable }];
  }

  const text = SENTENCE_BANK[agentId] ?? SENTENCE_BANK['default'] ?? '';
  const fragments = text.split(/(?<=[.,:])\s+/).filter((fragment) => fragment.length > 0);

  const chunks: UIMessageChunk[] = [
    start,
    { type: 'text-start', id: TEXT_ID },
    { type: 'text-delta', id: TEXT_ID, delta: `${prompt.trim().slice(0, 24)}… ` },
  ];
  for (const fragment of fragments) {
    chunks.push({ type: 'text-delta', id: TEXT_ID, delta: `${fragment} ` });
  }
  chunks.push({ type: 'text-end', id: TEXT_ID });

  // `dynamic: true` porque el cliente no declara un catálogo de herramientas: sin
  // él, el SDK esperaría una herramienta tipada que no existe. Con él la pieza
  // llega como `dynamic-tool`, que es la forma que el adapter sabe leer.
  //
  // El `tool-input-start` no es decorativo: es el chunk que ABRE la pieza, y sin
  // él el `tool-input-available` que llega detrás no crea nada que pintar.
  chunks.push({
    type: 'tool-input-start',
    toolCallId: TOOL_CALL_ID,
    toolName: TOOL_NAME,
    dynamic: true,
  });
  chunks.push({
    type: 'tool-input-available',
    toolCallId: TOOL_CALL_ID,
    toolName: TOOL_NAME,
    input: { q: prompt.slice(0, 32) },
    dynamic: true,
  });
  chunks.push({
    type: 'tool-output-available',
    toolCallId: TOOL_CALL_ID,
    output: { hits: 3 },
    dynamic: true,
  });

  chunks.push({ type: 'finish' });
  return chunks;
}

/** Ritmo humano, con jitter, para que dos ejecuciones no se vean idénticas. */
export function paceFor(chunk: UIMessageChunk): number {
  const base = chunk.type.startsWith('tool-') ? TOOL_MS : BASE_MS;
  return Math.round(base * (0.6 + Math.random() * 0.9));
}
