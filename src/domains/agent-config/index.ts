/**
 * @file src/domains/agent-config/index.ts
 * @description Barrel de cliente de la configuración por ejecución.
 *
 * Esqueleto: el endpoint `GET/PUT /api/agents/:agentId/config` ya responde y
 * valida; falta el formulario. Cuando se escriba, que use `DEFAULT_AGENT_SETTINGS`
 * como única fuente de los valores iniciales — el schema del BFF ya pone los
 * mismos defaults, y que se separen es la clase de bug que nobody ve venir.
 */
export { DEFAULT_AGENT_SETTINGS } from './types/agent-config.types';
export type { AgentRunSettings } from './types/agent-config.types';
