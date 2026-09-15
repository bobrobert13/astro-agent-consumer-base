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
 *  - `/slow` → silencio largo a mitad, para provocar el estado `stalled`;
 *  - comprobación de `signal.aborted` **antes de cada** chunk, para poder probar
 *    la cancelación sin red.
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

  if (prompt.trim().toLowerCase().startsWith('/slow')) {
    // Silencio deliberado a mitad: el watchdog del cliente debe marcar `stalled`.
    sequence.splice(2, 0, { type: 'text-delta', text: '(silencio simulado)… ' });
  }

  sequence.push({ type: 'finish', usage: { prompt: prompt.length, completion: text.length, total: prompt.length + text.length } });
  return sequence;
}

/**
 * Emite `chunks` con ritmo humano. Devuelve `true` si terminó la secuencia y
 * `false` si se abortó por el signal.
 */
export async function streamMockChunks(chunks: StreamChunk[], options: MockStreamOptions): Promise<boolean> {
  const { signal, onChunk, cps = 18 } = options;
  const base = Math.round(1000 / cps);

  for (const chunk of chunks) {
    if (signal.aborted) return false;
    await sleep(jitter(chunk.type === 'tool-call' || chunk.type === 'tool-result' ? base * 3 : base));
    if (signal.aborted) return false;
    onChunk(chunk);
  }
  return true;
}

function jitter(ms: number): number {
  return Math.round(ms * (0.6 + Math.random() * 0.9));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
