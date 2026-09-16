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
    //
    // `style-src` lleva `'unsafe-inline'` y `script-src` no, y esa asimetría es
    // la decisión, no un descuido:
    //
    //  - Los hashes que genera Astro solo cubren hojas estáticas (`<style>`,
    //    `<link>`) que existían en el momento del build. Vue escribe estilos en
    //    runtime desde `runtime-dom` —variables CSS `--offset`, `--width`,
    //    `--reka-*` para posicionar poppers y toasts—, y un valor calculado en el
    //    navegador no tiene hash posible: la política nace rota.
    //  - No lo arregla `style-src-attr 'unsafe-inline'` (medido con
    //    `npm run verify:electron`): el popper se posiciona, pero el CSSOM sigue
    //    cayendo contra `style-src`.
    //  - El vector que importa es el script. Ahí Astro sigue firmando cada chunk
    //    con SHA-256 y no hay ninguna excepción inline, así que inyectar
    //    JavaScript desde una respuesta del agente sigue bloqueado. Lo que cambia
    //    con estilos es que una respuesta hostil podría inyectar CSS: feo, no
    //    ejecutable.
    //
    // Se afloja estilos en producción y en dev no se ve nunca (CSP apagado), así
    // que el guardián es `verify:electron`, que corre contra la build.
    csp: isDev
      ? false
      : {
          styleDirective: {
            // `'self'` hay que repetirlo: al dar `resources` Astro deja de
            // añadirlo por defecto.
            resources: ["'self'", "'unsafe-inline'"],
          },
        },
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
    build: {
      rollupOptions: {
        output: {
          /**
           * `@mastra/client-js` vive en un chunk propio por construcción, no por
           * casualidad del chunking automático. Sin esto, Rollup puede fusionar
           * los helpers de interop CJS (compartidos por el grafo del cliente y
           * por `src/vue-app.ts`) dentro del chunk del proveedor, y entonces el
           * entrypoint de las islas importa **estáticamente** los ~480 KB de
           * `MastraClient`: exactamente la regresión que vigila
           * `npm run verify:bundle`.
           */
          manualChunks(id) {
            if (id.includes('node_modules/@mastra')) return 'mastra-vendor';
            return undefined;
          },
        },
      },
    },
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
