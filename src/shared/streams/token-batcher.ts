/**
 * @file src/shared/streams/token-batcher.ts
 * @description Coalescencia de deltas de tokens a una escritura por frame de pantalla.
 *
 * Por qué hace falta: un modelo a 60–120 tokens/s emite un `text-delta` por
 * fragmento. Volcar cada delta en el estado reactivo dispara un render por
 * token, y en una lista de mensajes grande eso es el "flicker" y el coste de CPU
 * que hace inviable un chat. Aquí se acumulan los trozos en un string plano y se
 * entrega uno por frame.
 *
 * Uso previsto: `useChatTranscript` alimenta `push()` desde el `onChunk` del
 * transporte y consume el texto que entrega `onFlush`. No se toca el DOM dentro
 * de este módulo: es agnóstico de Vue y del navegador, así que es testeable con
 * reloj falso.
 */
export interface TokenBatcher {
  /** Añade un fragmento al búfer actual. */
  push(chunk: string): void;
  /** Texto acumulado desde la última entrega. */
  pending(): string;
  /** Entrega el búfer inmediatamente (p. ej. al cerrar el mensaje). */
  flush(): string;
  /** Cancela la entrega programada y limpia. Seguro llamar varias veces. */
  destroy(): void;
}

export interface TokenBatcherOptions {
  /** Recepción del texto agrupado. Se llama al menos una vez por frame. */
  onFlush: (text: string) => void;
  /** Sobrescribible en tests. Default: `requestAnimationFrame` si existe. */
  schedule?: (callback: () => void) => () => void;
}

const identity = (callback: () => void) => {
  if (typeof requestAnimationFrame === 'function') {
    const handle = requestAnimationFrame(callback);
    return () => cancelAnimationFrame(handle);
  }
  const handle = setTimeout(callback, 16);
  return () => clearTimeout(handle);
};

export function createTokenBatcher(options: TokenBatcherOptions): TokenBatcher {
  const { onFlush, schedule = identity } = options;

  let buffer = '';
  let cancel: (() => void) | undefined;

  const deliver = (): void => {
    cancel = undefined;
    if (buffer === '') return;
    const text = buffer;
    buffer = '';
    onFlush(text);
  };

  return {
    push(chunk: string): void {
      buffer += chunk;
      if (cancel === undefined) cancel = schedule(deliver);
    },
    pending(): string {
      return buffer;
    },
    flush(): string {
      const text = buffer;
      buffer = '';
      if (cancel !== undefined) {
        cancel();
        cancel = undefined;
      }
      if (text !== '') onFlush(text);
      return text;
    },
    destroy(): void {
      buffer = '';
      if (cancel !== undefined) {
        cancel();
        cancel = undefined;
      }
    },
  };
}
