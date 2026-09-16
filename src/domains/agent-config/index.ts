/**
 * @file src/domains/agent-config/index.ts
 * @description Barrel de cliente de la configuración por ejecución.
 *
 * `AgentConfigCard` es la isla que monta una página; `useAgentConfig` queda fuera
 * a propósito: nadie más necesita el formulario, y exportarlo invita a copiar su
 * estado en otro sitio.
 */
export { default as AgentConfigCard } from './components/AgentConfigCard.vue';
export { DEFAULT_AGENT_SETTINGS } from './types/agent-config.types';
export type { AgentRunSettings } from './types/agent-config.types';
