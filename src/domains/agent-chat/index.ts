/**
 * @file src/domains/agent-chat/index.ts
 * @description Barrel de cliente del slice: la **única** superficie que pueden
 * importar páginas, layouts y otras slices.
 *
 * Desde que el estudio (`chat-studio`) posee la presentación, este slice es **solo
 * el motor**: transporte, orquestación, contrato de mensajes y BFF. La vista se
 * fue con sus componentes, y con ella la exportación de `ChatIsland`. Lo que
 * queda es lo que un consumidor necesita para hablar con un agente.
 *
 * Lo que no está aquí no es público. En particular, `server/**` tiene su propio
 * barrel (`./server/index.ts`) porque importarlo desde el cliente metería
 * `astro:env/server` en el bundle del navegador.
 */
export { useAgentChat } from './composables/useAgentChat';
export { checkTransport } from './composables/services/chat/chat.api';
export type {
  ChatMessage,
  ContentPart,
  MessageStatus,
  RunConfig,
  StreamState,
  TokenUsage,
  TransportHealth,
} from './types/chat.types';
