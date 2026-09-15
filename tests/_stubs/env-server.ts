/**
 * @file tests/_stubs/env-server.ts
 * @description Sustituto de `astro:env/server` para Vitest.
 *
 * Sin secretos reales: `MASTRA_API_KEY` se deja `undefined` para que los tests
 * del relay cubran también el camino sin credencial.
 */
export const MASTRA_URL = 'http://localhost:4111';
export const MASTRA_API_KEY: string | undefined = undefined;
export const AGENT_CONNECT_TIMEOUT = 10_000;
export const AGENT_IDLE_TIMEOUT = 60_000;
