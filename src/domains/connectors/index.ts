/**
 * @file src/domains/connectors/index.ts
 * @description Barrel de cliente del slice: la **única** superficie que puede
 * importar una página.
 *
 * Lo que no está aquí no es público. El slice no tiene `server/` —todavía no habla
 * con ningún backend, solo con su semilla— y su estado no sale de la isla, así que
 * el contrato se reduce a la vista y a los tipos que la página necesita para
 * resolver props.
 */
export { default as ConnectorsView } from './views/ConnectorsView.vue';
export { isConnectorTab } from './types/connector.types';
export type { ConnectorTab } from './types/connector.types';
