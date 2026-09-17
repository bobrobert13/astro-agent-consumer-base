import { createUIMessageStream, type ChatTransport, type UIMessage } from 'ai';

import { messageText } from './adapt-ui-messages';
import { lastUserMessage, type ScopeGetter } from './chat.scope';
import { answerFor, paceFor, stallFor } from './mock-script';

/**
 * @file src/domains/agent-chat/ai/chat.transport.mock.ts
 * @description Transporte que no toca la red. Es el default del boilerplate.
 *
 * Su función no es "hacer de cuenta que hay chat": es que la interfaz, el estado
 * `stalled`, la cancelación y el catálogo de errores se puedan desarrollar y
 * probar sin subir un backend. Por eso respeta el `signal` antes de **cada** chunk
 * (y el silencio de `/slow` es interrumpible: un cuelgue simulado de 27 s no puede
 * sobrevivir al abort) y emite el mismo vocabulario de chunks que el backend real.
 *
 * Implementa `ChatTransport` en vez de hablar por HTTP porque el punto del mock es
 * no tener servidor: declara `reconnectToStream` devolviendo `null`, que es la
 * respuesta correcta cuando no existe ninguna ejecución que retomar.
 */
export function createMockChatTransport(getScope: ScopeGetter): ChatTransport<UIMessage> {
  return {
    async sendMessages({ messages, abortSignal }) {
      const lastUser = lastUserMessage(messages);
      const prompt = lastUser === undefined ? '' : messageText(lastUser);
      const chunks = answerFor(getScope().agentId, prompt);
      const stall = stallFor(prompt);

      // `aborted` se lee a través de una función, no de una constante: es una
      // propiedad `readonly` del signal, así que TypeScript la estrecharía al
      // primer `if` y consideraría imposible el siguiente `false → true`.
      const aborted = (): boolean => abortSignal?.aborted === true;

      return createUIMessageStream<UIMessage>({
        execute: async ({ writer }) => {
          for (const [index, chunk] of chunks.entries()) {
            if (aborted()) return;

            if (stall !== undefined && index === stall.after) {
              await sleep(stall.ms, abortSignal);
              if (aborted()) return;
            }

            await sleep(paceFor(chunk), abortSignal);
            if (aborted()) return;
            writer.write(chunk);
          }
        },
      });
    },

    async reconnectToStream() {
      return null;
    },
  };
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
