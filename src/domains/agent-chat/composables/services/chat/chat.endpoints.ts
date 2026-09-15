import { createEndpoints } from '@shared/http/endpoints';

/**
 * @file src/domains/agent-chat/composables/services/chat/chat.endpoints.ts
 * @description Rutas del BFF que consume este slice.
 *
 * Todas apuntan al propio origen (`/api/...`): el navegador nunca conoce la
 * dirección del backend de agentes. El prefijo `agent-rpc` es el que pisa el
 * relay verbatim; `health` es JSON normalizado.
 */
const agentRpc = createEndpoints('/api/agent-rpc');
const api = createEndpoints('/api');

export const chatEndpoints = {
  /** Sondeo de disponibilidad del BFF y del transporte configurado. */
  health: () => api.url('health'),
  /** Ruta de ejecución en streaming para un agente. */
  run: (agentId: string) => agentRpc.url(`stream/${encodeURIComponent(agentId)}`),
  /** Prefijo que el cliente del proveedor recibe como `apiPrefix`. */
  rpcPrefix: () => '/api/agent-rpc',
} as const;
