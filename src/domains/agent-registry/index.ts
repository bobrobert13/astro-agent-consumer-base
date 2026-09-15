/**
 * @file src/domains/agent-registry/index.ts
 * @description Barrel de cliente del catálogo de agentes.
 *
 * Estado del slice en esta versión: **esqueleto funcional**. Hay BFF, hay hook
 * cacheado y hay tipos; falta la UI propia (tarjetas con filtros), que es lo que
 * cada proyecto escribe sobre el boilerplate.
 */
export { useAgentCatalog, AGENTS_QUERY_KEY } from './composables/useAgentCatalog';
export type { AgentDetail, AgentSummary } from './types/agent.types';
