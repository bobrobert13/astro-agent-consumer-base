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
 * decidir el CSP según entorno. Cargador mínimo, sin dependencias.
 *
 * Los dos archivos se leen **en orden de prioridad**: `.env.local` gana a `.env`
 * —igual que dentro de Vite—, y el entorno real gana a los dos. Sin esto, el
 * valor de `.env` se escribía en `process.env` y Vite lo prefiere al de
 * `.env.local` (copia `process.env` sobre lo parseado), así que
 * `npm run transport:mock` no surtía efecto: el interruptor decía `mock` y la app
 * seguía hablando con el backend real. Verificado.
 */
function loadDotEnv(files = ['.env', '.env.local']) {
  const fromFiles = new Set();
  for (const file of files) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      const key = match?.[1];
      const raw = match?.[2];
      if (key === undefined || raw === undefined) continue;
      // Comentario al final de la línea (como dotenv) y comillas opcionales: el
      // `#` solo abre comentario si le precede un espacio, así que una URL con
      // fragmento sobrevive.
      const value = raw
        .replace(/\s+#.*$/, '')
        .trim()
        .replace(/^(['"])(.*)\1$/, '$2');
      // Lo que ya venía del entorno del proceso no se pisa; lo que puso un archivo
      // anterior sí, que es como se resuelve la prioridad entre `.env` y `.env.local`.
      if (process.env[key] !== undefined && !fromFiles.has(key)) continue;
      process.env[key] = value;
      fromFiles.add(key);
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
      // ⚠️ La clave del schema ES el nombre de la variable: Astro la busca con
      // `loadEnv(mode, dir, '')` y hace `loadedEnv[key]`. Sin el prefijo
      // `PUBLIC_`, `loadedEnv['AGENT_TRANSPORT']` no existe, la validación no ve
      // nada y Astro inyecta el `default` en cada build — el interruptor de
      // transporte queda muerto sin que nada falle. Verificado.
      //
      // El prefijo no es cosmético: es la convención de Vite/Astro para "esto
      // acaba en el bundle del cliente", y `src/shared/env/client.ts` lo
      // re-exporta sin prefijo para que el resto del repo no lo arrastre.
      PUBLIC_APP_NAME: envField.string({
        context: 'client',
        access: 'public',
        default: 'Astro Agent Consumer',
      }),

      // `mock` arranca la app completa sin ningún backend.
      PUBLIC_AGENT_TRANSPORT: envField.enum({
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

      // Presupuesto hasta las PRIMERAS CABECERAS del upstream, y por eso no puede
      // ser corto: el backend no responde hasta que termina su trabajo previo —el
      // scope guard y el detector de inyección son llamadas al modelo—, así que
      // 10 s daban `connect_timeout` con un backend sano pero lento (medido: dos
      // guardrails y un proveedor remoto lo superan). Un 502 aquí miente: la
      // ejecución no falló, es que aún no había empezado a escribir.
      AGENT_CONNECT_TIMEOUT: envField.number({ context: 'server', access: 'secret', default: 30_000 }),

      // Máximo de silencio a mitad de stream. Se mide entre chunks, no de forma
      // acumulada: una respuesta larga y sana no es un cuelgue.
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
