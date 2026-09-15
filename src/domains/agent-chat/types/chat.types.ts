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

/** Parámetros de una ejecución. Validados en el BFF, no aquí. */
export interface RunConfig {
  model?: string | undefined;
  temperature?: number | undefined;
  instructions?: string | undefined;
  memoryEnabled?: boolean | undefined;
}

/** Lo que el cliente manda al relay para arrancar una ejecución. */
export interface StreamRequestBody {
  prompt: string;
  /** Opcional: el `resource` lo fija el servidor (ver `server/session-scope.ts`). */
  thread?: string | undefined;
  config?: RunConfig | undefined;
}
