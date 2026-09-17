import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath } from 'node:url';
import { aliases } from './aliases.mjs';

const r = (path: string): string => fileURLToPath(new URL(path, import.meta.url));

/**
 * Dos proyectos en vez de uno, porque el repo mezcla lógica pura en Node (kernel,
 * servicios, handlers del BFF) con componentes que necesitan DOM. Un único
 * entorno `jsdom` para todo haría lentos y ambiguos los tests de transporte.
 *
 * - `node`: sin DOM. Aquí viven `shared/**`, `<scope>.api.ts`, `server/**` y el
 *   test de fronteras de arquitectura.
 * - `dom`: jsdom, para montar componentes `.vue` con @vue/test-utils.
 *
 * El plugin de Vue es obligatorio para el proyecto `dom` y faltaba: sin él, Vite
 * intenta parsear el `.vue` como JS y falla con "Install @vitejs/plugin-vue".
 * Estaba instalado `@vue/test-utils` y `jsdom` pero ningún test podía montar un
 * componente, así que la promesa del comentario de arriba era falsa.
 */
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      ...aliases,
      // `astro:env/*` lo materializa Astro en el build; fuera de Astro el
      // specifier no existe, así que se resuelve a los stubs espejo de
      // `env.schema`. Solo aquí: `astro.config.mjs` NO debe mapearlos.
      'astro:env/client': r('./tests/_stubs/env-client.ts'),
      'astro:env/server': r('./tests/_stubs/env-server.ts'),
      // Por el mismo motivo: el estudio navega a `/` en "nuevo chat" y sin este
      // doble ningún componente suyo se puede importar en un test.
      'astro:transitions/client': r('./tests/_stubs/astro-transitions-client.ts'),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          include: ['tests/**/*.spec.ts'],
          exclude: ['tests/dom/**', 'tests/e2e/**'],
        },
      },
      {
        extends: true,
        test: {
          name: 'dom',
          environment: 'jsdom',
          include: ['tests/dom/**/*.spec.ts'],
          // jsdom no implementa `ResizeObserver` y reka-ui lo usa al montar
          // Slider/Select; sin el doble, un test de componente falla por el
          // entorno y parece un fallo del componente.
          setupFiles: ['tests/_stubs/dom-setup.ts'],
        },
      },
    ],
    globals: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/shared/**', 'src/domains/**'],
      // El barrel de cada slice y los `.vue` se prueban por comportamiento, no
      // por línea; medirlos aquí solo inflaría el número sin cazar nada.
      exclude: ['**/*.vue', '**/index.ts'],
      thresholds: { statements: 80, branches: 75, functions: 80, lines: 80 },
    },
  },
});
