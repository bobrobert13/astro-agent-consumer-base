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

/** Una pieza de contenido de un mensaje: texto, una herramienta o un bloqueo. */
export type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'tool-call'; toolName: string; args: unknown; result?: unknown }
  | {
      /**
       * El backend decidió NO ejecutar el mensaje (scope guard, detector de
       * inyección…). Para el usuario es el desenlace de la ejecución, no contenido
       * del agente, así que se pinta como un aviso y no como una respuesta.
       */
      type: 'notice';
      text: string;
      /** Detalle del backend, solo cuando es copy nuestra y no texto del modelo. */
      detail?: string | undefined;
    };

export interface ChatMessage {
  id: string;
  role: ChatRole;
  parts: ContentPart[];
  createdAt: string;
  status: MessageStatus;
  error?: string | undefined;
  usage?: TokenUsage | undefined;
}

/**
 * Presión de memoria del hilo, tal como la reporta el backend.
 *
 * Mastra emite este estado en cada step (la parte `data-om-status`) y **no** lo
 * persiste: describe sus ventanas de memoria observacional. Cuando una se acerca a
 * su techo, el backend resume el historial, así que verlo venir es información
 * útil para el usuario y no un detalle interno.
 */
export interface MemoryStatus {
  /** Tokens del historial de mensajes activo. */
  messageTokens: number;
  /** Techo de esa ventana: al alcanzarlo, Mastra resume. */
  messageThreshold: number;
  /** Tokens de observaciones (memoria a largo plazo). */
  observationTokens: number;
  observationThreshold: number;
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
