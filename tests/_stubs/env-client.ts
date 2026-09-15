/**
 * @file tests/_stubs/env-client.ts
 * @description Sustituto de `astro:env/client` para Vitest.
 *
 * `astro:env/*` lo materializa Astro en el build; fuera de Astro el specifier no
 * existe. El alias está en `vitest.config.ts`. Mantener este stub en espejo con
 * `env.schema` es parte del contrato: si añada un campo y olvida esta línea, los
 * tests de unidad fallan por `undefined`, no en producción.
 */
export const APP_NAME = 'Astro Agent Consumer';
export const AGENT_TRANSPORT = 'mock';
