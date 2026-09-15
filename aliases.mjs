/**
 * Única fuente de alias de rutas del proyecto.
 *
 * La importan `astro.config.mjs` y `vitest.config.ts`: si un alias se añade aquí,
 * queda disponible a la vez en el bundler y en los tests. Duplicarlos es la causa
 * clásica de "en Vitest no me resuelve el import".
 */
import { fileURLToPath } from 'node:url';

const src = (p) => fileURLToPath(new URL(`./src/${p}`, import.meta.url));

export const aliases = {
  '@': src(''),
  '@shared': src('shared'),
  '@domains': src('domains'),
  '@components': src('components'),
  '@layouts': src('layouts'),
  '@composables': src('composables'),
  '@stores': src('stores'),
  '@config': src('config'),
};
