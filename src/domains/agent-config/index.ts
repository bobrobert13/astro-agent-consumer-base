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
/**
 * El catálogo de códigos es vocabulario público del slice: el handler del BFF
 * (`/api/agents/[agentId]/config`) tiene que emitir exactamente el código que la
 * UI sabe traducir, y llegar al archivo por ruta interna sería saltarse el
 * barrel. Sin esto, los dos lados vuelven a divergir.
 */
export { CONFIG_ERROR_CODES } from './composables/services/config/config.e';
