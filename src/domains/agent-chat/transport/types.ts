import type { Result } from '@shared/result/result.pattern';
import type { RunConfig, TokenUsage } from '../types/chat.types';

/**
 * @file src/domains/agent-chat/transport/types.ts
 * @description El contrato que sostiene todo el slice, y la razón por la que el
 * boilerplate no queda casado con un proveedor.
 *
 * Ni Vue ni el proveedor de agentes aparecen aquí. `useAgentChat` solo conoce
 * `AgentTransport`; `transport/mock.ts` y `transport/mastra.ts` son sustitutos
 * exactos, elegidos por variable de entorno. Eso tiene tres consecuencias que
 * importan:
 *  - el chat se desarrolla y se prueba **sin backend**;
 *  - cambiar de proveedor es un archivo nuevo en `transport/`, no una refactorización;
 *  - el plan B contra el riesgo R1 (SDK con dependencias conflictivas) es
 *    implementar este contrato con `@shared/streams/sse.ts` y que nada más cambie.
 */

/** Parámetros de una ejecución sobre el transporte. */
export interface StreamInput {
  agentId: string;
  prompt: string;
  thread: string;
  config?: RunConfig | undefined;
}

/** Piezas que puede emitir un stream, ya traducidas al idioma del dominio. */
export type StreamChunk =
  | { type: 'text-delta'; text: string }
  | { type: 'text-end' }
  | { type: 'tool-call'; toolName: string; args: unknown }
  | { type: 'tool-result'; toolName: string; result: unknown }
  | { type: 'finish'; usage?: TokenUsage | undefined }
  | { type: 'error'; message: string; code?: string | undefined };

/** Contexto de ejecución de un stream. */
export interface StreamContext {
  /** Cancelación: el transporte debe respetarla en cada punto de espera. */
  signal: AbortSignal;
  /** Recepción de chunks, ya en el vocabulario del dominio. */
  onChunk: (chunk: StreamChunk) => void;
}

export interface TransportHealth {
  reachable: boolean;
  transport: 'mock' | 'mastra';
  detail?: string | undefined;
}

export interface AgentTransport {
  /**
   * Ejecuta un prompt y emite sus chunks. **Nunca lanza**: un fallo de red, un
   * abort o un error del modelo vuelven como `Result`.
   */
  stream(input: StreamInput, context: StreamContext): Promise<Result<void>>;
  /** Sondeo barato para mostrar "backend disponible / no disponible" en el shell. */
  health(): Promise<Result<TransportHealth>>;
}
