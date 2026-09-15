/**
 * @file src/domains/agent-sessions/index.ts
 * @description Barrel de cliente de los hilos de conversación.
 *
 * Esqueleto funcional: el endpoint y el hook cacheado existen; la barra lateral
 * que los pinta es trabajo del proyecto que nazca de aquí. Quien la escriba debe
 * suscribir el refetch al evento de dominio `agent:run-finished`, no sondear.
 */
export { useThreadList, THREADS_QUERY_KEY } from './composables/useThreadList';
export type { Page, ThreadDetail, ThreadSummary } from './types/session.types';
