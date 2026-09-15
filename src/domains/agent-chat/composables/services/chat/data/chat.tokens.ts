import { STREAM_STALL_MS } from '@config/app';
import type { StreamChunk } from '../../../../transport/types';

/**
 * @file src/domains/agent-chat/composables/services/chat/data/chat.tokens.ts
 * @description Generador de tokens del transporte `mock`.
 *
 * No es un simple `setTimeout` imprimiendo texto: imita las cosas que rompen un
 * chat y que por tanto hay que poder ejercitar sin backend:
 *  - deltas de tamaño irregular (así llegan los modelos reales, palabra a palabra);
 *  - un `tool-call` en medio, para que `ToolCallCard` se vea alguna vez;
 *  - `/error` → chunk de error con código del catálogo;
 *  - `/slow` → silencio real más largo que `STREAM_STALL_MS`, para provocar el
 *    estado `stalled` igual que lo haría un agente de verdad callado;
 *  - comprobación de `signal.aborted` **antes de cada** chunk (y el silencio es
 *    interrumpible), para poder probar la cancelación sin red.
 */

const SENTENCE_BANK: Record<string, string> = {
  default:
    'Este es un flujo simulado del boilerplate. Sirve para desarrollar la interfaz de chat sin levantar ningún backend: los deltas llegan en trozos irregulares, como lo hacen los modelos reales, y el transcript se alimenta por frame de pantalla.',
  research:
    'Como agente de investigación simulado, diría que el diseño de este boilerplate separa tres capas: el transporte que habla con el proveedor, el BFF que reenvía el stream sin tocarlo, y la isla que solo conoce un contrato de chunks.',
  tasks:
    'Agente de tareas simulado: puedo descomponer un objetivo en pasos. Paso 1, definir el resultado esperado. Paso 2, listar las dependencias. Paso 3, ejecutar y reportar desviaciones.',
};

export interface MockStreamOptions {
  signal: AbortSignal;
  onChunk: (chunk: StreamChunk) => void;
  /** Chunks por segundo simulados. Bajo para poder ver el efecto. */
  cps?: number;
  /** Silencio real a mitad de la secuencia: el watchdog del cliente debe marcar `stalled`. */
  stall?: MockStall;
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

/** Construye la secuencia de chunks que respondería un agente para `prompt`. */
export function answerFor(agentId: string, prompt: string): StreamChunk[] {
  if (prompt.trim().toLowerCase().startsWith('/error')) {
    return [
      { type: 'error', code: 'upstream_unreachable', message: 'El agente no está disponible ahora mismo.' },
    ];
  }

  const text = SENTENCE_BANK[agentId] ?? SENTENCE_BANK['default'] ?? '';
  const chunks = text.split(/(?<=[.,:])\s+/).filter((part) => part.length > 0);

  const sequence: StreamChunk[] = [{ type: 'text-delta', text: `${prompt.trim().slice(0, 24)}… ` }];
  for (const part of chunks) sequence.push({ type: 'text-delta', text: `${part} ` });
  sequence.push({ type: 'text-end' });
  sequence.push({ type: 'tool-call', toolName: 'buscar_documentacion', args: { q: prompt.slice(0, 32) } });
  sequence.push({ type: 'tool-result', toolName: 'buscar_documentacion', result: { hits: 3 } });
  sequence.push({ type: 'finish', usage: { prompt: prompt.length, completion: text.length, total: prompt.length + text.length } });
  return sequence;
}

/**
 * Emite `chunks` con ritmo humano. Devuelve `true` si terminó la secuencia y
 * `false` si se abortó por el signal.
 */
export async function streamMockChunks(chunks: StreamChunk[], options: MockStreamOptions): Promise<boolean> {
  const { signal, onChunk, cps = 18, stall } = options;
  const base = Math.round(1000 / cps);

  for (const [index, chunk] of chunks.entries()) {
    if (signal.aborted) return false;

    if (stall !== undefined && index === stall.after) {
      await sleep(stall.ms, signal);
      if (signal.aborted) return false;
    }

    await sleep(jitter(chunk.type === 'tool-call' || chunk.type === 'tool-result' ? base * 3 : base), signal);
    if (signal.aborted) return false;
    onChunk(chunk);
  }
  return true;
}

function jitter(ms: number): number {
  return Math.round(ms * (0.6 + Math.random() * 0.9));
}

/** Espera interrumpible: un silencio de 27 s no puede sobrevivir al abort. */
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted === true) {
      resolve();
      return;
    }
    const timer = setTimeout(finish, ms);
    function finish(): void {
      clearTimeout(timer);
      signal?.removeEventListener('abort', finish);
      resolve();
    }
    signal?.addEventListener('abort', finish, { once: true });
  });
}
