import { resultError, resultOk, normalizeServiceError, type Result } from '@shared/result/result.pattern';
import type { TokenUsage } from '../types/chat.types';
import type { AgentTransport, StreamChunk, StreamContext, StreamInput, TransportHealth } from './types';
import { checkTransport } from '../composables/services/chat/chat.api';
import { chatEndpoints } from '../composables/services/chat/chat.endpoints';

/**
 * @file src/domains/agent-chat/transport/mastra.ts
 * @description **Único archivo del repo** que nombra `@mastra/client-js`.
 *
 * Dos invariants que no se deben perder al tocarlo:
 *
 * 1. Se carga con `await import()` desde `transport/index.ts`, nunca estático.
 *    El paquete arrastra `@mastra/core` como dependencia; si entrara por el
 *    grafo normal, ese peso iría en el chunk inicial de la isla.
 * 2. Traduce el vocabulario del proveedor al vocabulario del dominio
 *    (`StreamChunk`). El resto del slice no sabe qué es un `text-delta` de AI-SDK:
 *    eso es lo que permite cambiar de proveedor sin reescribir la UI.
 *
 * El `baseUrl` es el propio origen: el cliente habla con `/api/agent-rpc/*` y el
 * BFF reenvía. La credencial nunca existe de este lado.
 */

/**
 * Adaptador estructural del cliente.
 *
 * `@mastra/client-js` publica sus tipos generados desde el OpenAPI del servidor,
 * con sobrecargas condicionales que no se pueden escribir a mano sin atarse a la
 * versión. Se declara aquí la forma que realmente se usa, y la verificación de
 * que corresponde con el servidor en marcha es el objetivo de la fase de
 * integración con Mastra real (`npm run transport:mastra` contra `:4111`).
 */
interface UpstreamStreamResponse {
  processDataStream(args: { onChunk: (chunk: unknown) => void | Promise<void> }): Promise<void>;
}

interface UpstreamAgent {
  stream(prompt: string, options: Record<string, unknown>): Promise<UpstreamStreamResponse>;
}

interface UpstreamClient {
  getAgent(agentId: string): UpstreamAgent;
}

async function loadClient(): Promise<UpstreamClient> {
  const { MastraClient } = await import('@mastra/client-js');
  return new MastraClient({
    baseUrl: typeof window === 'undefined' ? 'http://127.0.0.1:4321' : window.location.origin,
    // Del mapa de rutas del slice, no un literal repetido: `chat.endpoints` es
    // donde vive qué es público del BFF.
    apiPrefix: chatEndpoints.rpcPrefix(),
  }) as unknown as UpstreamClient;
}

/**
 * Un chunk del stream de Mastra, en la parte que nos interesa. Se tipa a mano
 * para no importar tipos del proveedor fuera de este archivo.
 */
interface UpstreamChunk {
  type: string;
  payload?: {
    text?: string;
    toolName?: string;
    args?: unknown;
    result?: unknown;
    usage?: unknown;
    message?: string;
    /**
     * Forma real del frame `error` de Mastra 1.29, observada contra el backend en
     * marcha: `payload: { error: { message, stack? } }`. El texto de ese objeto es
     * internals del servidor ("Processor workflow … requires …"), así que aquí se
     * captura para diagnóstico y la UI muestra el catálogo en español.
     */
    error?: { message?: string; stack?: string };
  };
}

export const mastraTransport: AgentTransport = {
  async stream(input: StreamInput, context: StreamContext): Promise<Result<void>> {
    try {
      const client = await loadClient();
      const agent = client.getAgent(input.agentId);

      const response = await agent.stream(input.prompt, {
        /**
         * Solo el hilo. El `resource` —la identidad con la que el backend agrupa
         * la memoria— NO se manda desde aquí: lo inyecta el BFF en
         * `server/session-scope.ts`. Si el navegador pudiera fijarlo, cualquiera
         * leería el historial de otro poniendo su id en el cuerpo.
         */
        memory: { thread: input.thread },
        abortSignal: context.signal,
      });

      await response.processDataStream({
        onChunk: async (raw: unknown) => {
          const translated = translateChunk(raw as UpstreamChunk);
          if (translated !== undefined) context.onChunk(translated);
        },
      });

      return resultOk<void>(undefined);
    } catch (error) {
      if (context.signal.aborted) return resultOk<void>(undefined);
      return resultError<void>(normalizeServiceError(error, 502));
    }
  },

  /**
   * Disponibilidad consultada al BFF, no al upstream en crudo: el navegador no
   * conoce su dirección, así que `checkTransport()` es la única sonda posible
   * (y la que usa el propio shell para enseñar el estado del backend).
   */
  async health(): Promise<Result<TransportHealth>> {
    return checkTransport();
  },
};

/** Mapa del wire format del proveedor al contrato propio. */
export function translateChunk(chunk: UpstreamChunk): StreamChunk | undefined {
  switch (chunk.type) {
    case 'text-delta':
      return { type: 'text-delta', text: chunk.payload?.text ?? '' };
    case 'text-end':
      return { type: 'text-end' };
    case 'tool-call':
      return { type: 'tool-call', toolName: chunk.payload?.toolName ?? 'herramienta', args: chunk.payload?.args };
    case 'tool-result':
      return { type: 'tool-result', toolName: chunk.payload?.toolName ?? 'herramienta', result: chunk.payload?.result };
    case 'finish':
      return { type: 'finish', usage: chunk.payload?.usage as TokenUsage | undefined };
    case 'error':
      return {
        type: 'error',
        message: chunk.payload?.error?.message ?? chunk.payload?.message ?? 'El agente devolvió un error.',
      };
    default:
      // `start`, `step-start`, `step-finish`, `data-om-status`,
      // `message-metadata`: observados en el stream real de Mastra 1.29. Se
      // descartan de forma explícita en vez de rebotar a la UI un tipo que no
      // existe en el dominio.
      return undefined;
  }
}
