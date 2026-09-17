/**
 * @file src/domains/chat-studio/index.ts
 * @description Barrel de cliente del slice: la **única** superficie que pueden
 * importar páginas y layouts.
 *
 * Lo que no está aquí no es público. A diferencia de `agent-chat`, este slice no
 * tiene `server/`: es presentación pura y no habla con el backend, solo con el
 * motor de chat a través de su barrel.
 */
export { default as ChatStudio } from './components/ChatStudio.vue';
export type { PanelTab, ResourceRow, SourceRow, SourceScope } from './types/studio.types';
