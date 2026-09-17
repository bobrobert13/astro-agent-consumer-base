import { DefaultChatTransport, type ChatTransport, type UIMessage } from 'ai';

import { AGENT_TRANSPORT } from '@shared/env/client';
import { chatEndpoints } from '../composables/services/chat/chat.endpoints';
import { lastUserMessage, type ScopeGetter } from './chat.scope';
import { createMockChatTransport } from './chat.transport.mock';

/**
 * @file src/domains/agent-chat/ai/chat.transport.ts
 * @description Selección de transporte, y **única** definición del wire format
 * que el cliente envía al BFF.
 *
 * El transporte se construye **una vez** y no se recrea al cambiar de agente o de
 * hilo: `DefaultChatTransport` fija su `api` al construirse, así que el alcance se
 * inyecta por petición desde `prepareSendMessagesRequest`, que lee los refs en el
 * momento del envío (ver `chat.scope.ts`). Esa es la razón de que haya un solo
 * endpoint (`/api/agent-chat`) para todas las conversaciones.
 *
 * Forma del cuerpo — el BFF la valida con `chatRequestSchema` y el relay la
 * reenvía intacta salvo `memory.resource`, que decide el servidor (ADR-006):
 *
 * ```jsonc
 * { "agentId": "research-agent",
 *   "messages": [ <UIMessage> ],          // solo el último del usuario
 *   "memory": { "thread": "nuevo" } }
 * ```
 */
export function resolveChatTransport(getScope: ScopeGetter): ChatTransport<UIMessage> {
  if (AGENT_TRANSPORT === 'mock') return createMockChatTransport(getScope);

  return new DefaultChatTransport<UIMessage>({
    api: chatEndpoints.chat(),
    prepareSendMessagesRequest: ({ messages }) => {
      const lastUser = lastUserMessage(messages);
      return {
        body: {
          agentId: getScope().agentId,
          messages: lastUser === undefined ? [] : [lastUser],
          memory: { thread: getScope().thread },
        },
      };
    },
  });
}
