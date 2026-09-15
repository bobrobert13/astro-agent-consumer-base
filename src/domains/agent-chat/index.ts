/**
 * @file src/domains/agent-chat/index.ts
 * @description Barrel de cliente del slice: la **única** superficie que pueden
 * importar páginas, layouts y otras slices.
 *
 * Lo que no está aquí no es público. En particular, `server/**` tiene su propio
 * barrel (`./server/index.ts`) porque importarlo desde el cliente metería
 * `astro:env/server` en el bundle del navegador.
 */
export { default as ChatIsland } from './components/ChatIsland.vue';
export { useAgentChat } from './composables/useAgentChat';
export { useChatTranscript } from './composables/useChatTranscript';
export type { AgentTransport, StreamChunk, StreamInput, StreamContext } from './transport/types';
export type { ChatMessage, ContentPart, MessageStatus, RunConfig, StreamState, TokenUsage } from './types/chat.types';
