/**
 * @file src/shared/env/client.ts
 * @description Barril del entorno visible desde el navegador.
 *
 * Por qué existe un archivo aparte en vez de un único `env.ts`: importar
 * `astro:env/server` desde código que termina en el chunk del cliente **rompe el
 * build**. Al separarlos, el error deja de ser posible por estructura: el nombre
 * del archivo dice qué lado puede usarlo.
 *
 * Regla: `@shared/env/client` lo importan composables, componentes `.vue` y
 * `<scope>.api.ts`. Nunca un módulo bajo `server/`.
 */
export { AGENT_TRANSPORT, APP_NAME } from 'astro:env/client';

export type AgentTransportKind = 'mock' | 'mastra';
