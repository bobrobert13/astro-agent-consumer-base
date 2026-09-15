// @ts-check
import { defineConfig, envField } from 'astro/config';

import vue from '@astrojs/vue';
import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';

import { existsSync, readFileSync } from 'node:fs';
import { aliases } from './aliases.mjs';

/**
 * Astro NO puebla `process.env` desde `.env` para el propio archivo de config
 * (docs: "You cannot use it in astro.config.mjs"), y aquí leemos variables para
 * decidir el CSP según entorno. Cargador mínimo, sin dependencias: solo claves
 * aún no definidas en el entorno real.
 */
function loadDotEnv(file = '.env') {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const [, key, value] = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/) ?? [];
    if (key !== undefined && value !== undefined && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}
loadDotEnv();

const isDev = process.env.NODE_ENV !== 'production';

// https://astro.build/config
export default defineConfig({
  site: 'http://localhost:4321',

  // Todo se sirve por defecto desde el servidor: el BFF (`src/pages/api/**`) es
  // parte del producto. Las páginas que no necesitan datos por-request optan a
  // estático con `export const prerender = true`.
  output: 'server',
  adapter: node({
    mode: 'standalone',
    // Default 1 GB: inútilmente peligroso para un chat que reenvía prompts.
    bodySizeLimit: 2 * 1024 * 1024,
    // Con CSP activo, el adapter la emite también como cabecera, no solo <meta>.
    staticHeaders: true,
  }),

  // La memoria de las conversaciones la tiene el backend de agentes.
  // `false` excluye el runtime de sesiones de Astro del bundle del servidor.
  session: false,

  // El Markdown de las respuestas del agente se renderiza en el cliente
  // (`MarkdownBlock.vue`), no en el build. Desactivar el resaltado de Astro evita
  // el aviso de CSP (Shiki inyecta `style=""` inline, prohibido con `csp: true`)
  // y saca Shiki del bundle del servidor.
  markdown: {
    syntaxHighlight: false,
  },

  // Default en v7, explícito por legibilidad: sensible al whitespace JSX.
  compressHTML: 'jsx',

  security: {
    // CSP desactivado en dev: interfiere con el WebSocket de HMR de Vite.
    csp: !isDev,
    checkOrigin: true,
  },

  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'hover',
  },

  integrations: [
    vue({
      // `appEntrypoint` es el escape hatch oficial para ejecutar código sobre la
      // `App` de Vue de CADA isla antes de `app.mount()`: es lo que permite
      // instalar Pinia y colada, que de otro modo serían inalcanzables porque
      // @astrojs/vue hace un `createApp()` por isla.
      appEntrypoint: 'src/vue-app.ts',
    }),
  ],

  env: {
    schema: {
      APP_NAME: envField.string({ context: 'client', access: 'public', default: 'Astro Agent Consumer' }),

      // `mock` arranca la app completa sin ningún backend.
      AGENT_TRANSPORT: envField.enum({
        context: 'client',
        access: 'public',
        values: ['mock', 'mastra'],
        default: 'mock',
      }),

      // ⚠️ `access: 'secret'` aquí no es una opción de seguridad sino de
      // semántica: con `access: 'public'` Astro **inlinea el valor en el build**,
      // y un `MASTRA_URL` cambiado en el entorno del proceso no se enteraba
      // (verificado: el servidor seguía apuntando al valor de compilación). Como
      // estos tres son solo del proceso Node y deben poder fijarse en el
      // arranque —incluido el shell empaquetado de Electron—, se declaran secret.
      MASTRA_URL: envField.string({
        context: 'server',
        access: 'secret',
        default: 'http://localhost:4111',
        url: true,
      }),
      MASTRA_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),

      AGENT_CONNECT_TIMEOUT: envField.number({ context: 'server', access: 'secret', default: 10_000 }),
      AGENT_IDLE_TIMEOUT: envField.number({ context: 'server', access: 'secret', default: 60_000 }),
    },
  },

  vite: {
    plugins: [tailwindcss()],
    server: {
      // 127.0.0.1 y no 0.0.0.0: Electron carga el renderer desde ese literal y
      // el WebSocket de HMR debe resolver a la misma interfaz.
      host: '127.0.0.1',
      port: 4321,
      // `astro dev` se niega a arrancar con el puerto ocupado en lugar de
      // migrar a otro: el shell Electron necesita saber el puerto por contrato.
      strictPort: true,
    },
    resolve: { alias: aliases },
  },
});
