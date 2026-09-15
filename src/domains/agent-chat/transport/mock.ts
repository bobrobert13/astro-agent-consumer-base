import { resultOk } from '@shared/result/result.pattern';
import type { AgentTransport, StreamContext, StreamInput } from './types';
import { answerFor, streamMockChunks } from '../composables/services/chat/data/chat.tokens';

/**
 * @file src/domains/agent-chat/transport/mock.ts
 * @description Transporte que no toca la red. Es el default del boilerplate.
 *
 * Su función no es "hacer de cuenta que hay chat": es que la interfaz, el
 * batching de tokens, la cancelación, el estado `stalled` y el catálogo de
 * errores se puedan desarrollar y probar sin subir un backend. Por eso respeta
 * el `signal` en cada paso y emite el mismo vocabulario de chunks que el
 * transporte real.
 */
export const mockTransport: AgentTransport = {
  async stream(input: StreamInput, context: StreamContext) {
    const completed = await streamMockChunks(answerFor(input.agentId, input.prompt), {
      signal: context.signal,
      onChunk: context.onChunk,
    });

    // Un abort no es un fallo: el llamador ya limpió su estado al cancelar.
    void completed;
    return resultOk<void>(undefined);
  },

  async health() {
    return resultOk({ reachable: true, transport: 'mock' as const });
  },
};
