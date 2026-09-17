/**
 * @file src/domains/agent-chat/types/chat.types.ts
 * @description Tipos del dominio de la conversación. Son el idioma común entre
 * el transporte, los composables y las islas.
 */

export type ChatRole = 'user' | 'assistant' | 'system';

export type MessageStatus = 'streaming' | 'done' | 'error' | 'aborted';

/** Uso de tokens reportado al cerrar una ejecución. */
export interface TokenUsage {
  prompt?: number | undefined;
  completion?: number | undefined;
  total?: number | undefined;
}

/** Una pieza de contenido de un mensaje: texto o una herramienta invocada. */
export type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'tool-call'; toolName: string; args: unknown; result?: unknown };

export interface ChatMessage {
  id: string;
  role: ChatRole;
  parts: ContentPart[];
  createdAt: string;
  status: MessageStatus;
  error?: string | undefined;
  usage?: TokenUsage | undefined;
}

/** Estado de la máquina de streaming de una ejecución. */
export type StreamState = 'idle' | 'connecting' | 'streaming' | 'stalled' | 'error';

/**
 * Disponibilidad del backend tal como la ve el navegador.
 *
 * `transport` dice qué implementación está activa, para que la UI pueda decir la
 * verdad (transporte simulado o real) en vez de fingir que hay agente detrás.
 */
export interface TransportHealth {
  reachable: boolean;
  transport: 'mock' | 'mastra';
  detail?: string | undefined;
}

/** Parámetros de una ejecución. Validados en el BFF, no aquí. */
export interface RunConfig {
  model?: string | undefined;
  temperature?: number | undefined;
  instructions?: string | undefined;
  memoryEnabled?: boolean | undefined;
}
