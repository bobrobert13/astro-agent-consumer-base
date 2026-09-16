/**
 * @file tests/_stubs/env-client.ts
 * @description Sustituto de `astro:env/client` para Vitest.
 *
 * `astro:env/*` lo materializa Astro en el build; fuera de Astro el specifier no
 * existe. El alias está en `vitest.config.ts`. Mantener este stub en espejo con
 * `env.schema` es parte del contrato: si añade un campo y olvida esta línea, los
 * tests de unidad fallan por `undefined`, no en producción.
 *
 * Los nombres exportados son los del schema, con prefijo incluido: la clave de
 * `env.schema` ES el nombre de la variable, y `@shared/env/client` es quien los
 * re-exporta sin prefijo para el resto del repo.
 */
export const PUBLIC_APP_NAME = 'Astro Agent Consumer';
export const PUBLIC_AGENT_TRANSPORT = 'mock';
