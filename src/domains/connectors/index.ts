/**
 * @file src/domains/connectors/index.ts
 * @description Barrel de cliente del slice: la **única** superficie que pueden
 * importar los consumidores.
 *
 * Lo que no está aquí no es público. El slice no tiene `server/` —todavía no habla
 * con ningún backend, solo con su semilla— y su estado no sale de la isla, así que
 * el contrato se reduce a la superficie que monta el estudio y al tipo que este
 * necesita para recordar en qué sección está el panel.
 *
 * La guarda `isConnectorTab` **no** se exporta: solo la usa el propio panel para
 * leer el `update:modelValue` del `Tabs`, y una guarda pública que nadie llama es
 * una invitación a validar dos veces lo mismo.
 */
export { default as ConnectorsPanel } from './views/ConnectorsPanel.vue';
export type { ConnectorTab } from './types/connector.types';
