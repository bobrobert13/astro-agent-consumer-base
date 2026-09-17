import { createEndpoints } from '@shared/http/endpoints';

/**
 * @file src/domains/agent-chat/composables/services/chat/chat.endpoints.ts
 * @description Rutas del BFF que consume este slice.
 *
 * Todas apuntan al propio origen (`/api/...`): el navegador nunca conoce la
 * dirección del backend de agentes. `agent-chat` es el stream (lo reenvía el
 * relay) y `health` es JSON normalizado.
 */
const api = createEndpoints('/api');

export const chatEndpoints = {
  /** Sondeo de disponibilidad del BFF y del transporte configurado. */
  health: () => api.url('health'),
  /**
   * Ejecución de chat: un único endpoint estable para todas las conversaciones.
   *
   * El agente y el hilo no van en la URL sino en el cuerpo
   * (`prepareSendMessagesRequest` en `ai/chat.transport.ts`), así que el
   * transporte del cliente se construye una vez y no hay que recrearlo al cambiar
   * de agente.
   */
  chat: () => api.url('agent-chat'),
} as const;
