/**
 * @file src/domains/agent-chat/server/index.ts
 * @description Barrel del lado servidor del slice.
 *
 * Existe en paralelo a `../index.ts` (el de cliente) y la separación no es
 * cosmética: si la lógica del BFF saliera por el barrel de cliente, `astro:env/server`
 * y la credencial del upstream terminarían en el grafo del navegador y el build
 * rompería — o peor, filtraría. `src/pages/api/**` importa SIEMPRE esta ruta.
 */
export { relayStream } from './stream-relay';
export { parseRunRequest, agentSummarySchema, agentConfigSchema } from './normalize-agent-run';
export { withGateway, readJsonBody, BodyTooLargeError } from './gateway';
export { resolveScope, sanitizeThread, resourceCookie } from './session-scope';
