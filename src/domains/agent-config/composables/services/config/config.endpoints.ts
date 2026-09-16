import { createEndpoints } from '@shared/http/endpoints';

/**
 * @file src/domains/agent-config/composables/services/config/config.endpoints.ts
 * @description Rutas de configuración por agente. El id se codifica aquí, en el
 * único sitio que las construye, para que ningún llamador se lo olvide.
 */
const agents = createEndpoints('/api/agents');

export const configEndpoints = {
  /** `GET`/`PUT /api/agents/:agentId/config` — misma URL, distinto verbo. */
  forAgent: (agentId: string): string => agents.url(`${encodeURIComponent(agentId)}/config`),
} as const;
