/**
 * @file src/domains/agent-chat/components/chat.memo.ts
 * @description Dependencias de `v-memo` para un globo del transcript.
 *
 * Vive en su propio módulo, y no dentro del componente, porque es una regla con
 * un bug detrás: memorizar un globo se hace con `[id, status]`, y el globo en
 * vuelo llega **sintetizado** desde `ChatTranscript` con `id: 'streaming'` y
 * `status: 'streaming'` constantes. Con esas dos dependencias no cambian nunca,
 * Vue reutiliza el vnode y el texto visible se queda congelado en el primer
 * chunk hasta que la respuesta cierra y se promociona a mensaje real.
 *
 * Por eso la longitud del texto forma parte de las dependencias: es lo único que
 * distingue un frame del siguiente. Al ser una función pura, el invariante se
 * prueba sin montar un componente (`tests/agent-chat/message-memo.spec.ts`).
 */
import type { ChatMessage } from '../types/chat.types';

/**
 * Longitud total del texto de un mensaje. Un mensaje con tool-calls pero sin
 * texto mide 0, y eso está bien: lo que cambia con el tiempo es el texto.
 */
export function messageTextLength(message: ChatMessage): number {
  let total = 0;
  for (const part of message.parts) {
    if (part.type === 'text') total += part.text.length;
  }
  return total;
}

/** Valores que, si no cambian, permiten a Vue saltarse el re-render del globo. */
export function messageMemoDeps(message: ChatMessage): (string | number)[] {
  return [message.id, message.status, messageTextLength(message)];
}
