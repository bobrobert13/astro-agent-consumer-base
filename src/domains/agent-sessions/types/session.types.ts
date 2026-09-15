/**
 * @file src/domains/agent-sessions/types/session.types.ts
 * @description DTO de los hilos de conversación.
 */
export interface ThreadSummary {
  id: string;
  title: string;
  /** ISO 8601; cadena vacía si el upstream no la reporta. */
  updatedAt: string;
}

export interface ThreadDetail extends ThreadSummary {
  agentId: string;
  messageCount: number;
}

/** Página simple: el upstream no always reporta total. */
export interface Page<T> {
  items: T[];
  total: number | undefined;
}
