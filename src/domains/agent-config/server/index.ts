/**
 * @file src/domains/agent-config/server/index.ts
 * @description Barrel del lado servidor del slice.
 *
 * Separado del `index.ts` de cliente por el mismo motivo que en `agent-chat`:
 * este importa `@shared/server/**`, que arrastra `astro:env/server`. Si saliera
 * por el barrel de cliente, el build rompería —o peor, filtraría— al llegar al
 * navegador. `src/pages/api/**` y las páginas que resuelven datos en el servidor
 * (`settings.astro`) importan SIEMPRE esta ruta.
 */
export { agentConfigSchema } from './config.schema';
export { readAgentConfig } from './read-config';
export type { ReadConfigOptions } from './read-config';
