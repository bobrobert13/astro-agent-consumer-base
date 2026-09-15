# AGENTS.md — astro-agent-consumer

Boilerplate del que nacen los sistemas que **consumen agentes de IA**. Astro 7 en
modo servidor actúa de BFF: el navegador nunca ve la URL real del backend de
agentes ni sus credenciales.

Lea este archivo antes de tocar código. Cada directorio de `src/` tiene su propio
`AGENTS.md` con las reglas de ese ámbito.

## Development

```bash
cp .env.example .env    # una vez
npm run dev             # astro dev en 127.0.0.1:4321
npm run dev:bg          # daemon; se gestiona con dev:stop / dev:status / dev:logs
npm run build && npm run start
npm run all             # lint + check + test + build: la puerta de todo commit
```

Con `PUBLIC_AGENT_TRANSPORT=mock` (el default) **no hace falta ningún backend**:
el chat emite tokens simulados. Para apuntar al Mastra real,
`npm run transport:mastra` y arranque `mastra-agente-ejemplo/mastra-boilerplate`
en `:4111` (ids reales verificados: `research-agent`, `tasks-agent`, `files-agent`,
`communication-agent` — el default del slice es `research-agent`).

## Arquitectura: slicing vertical

`src/domains/<slice>/` es un contexto acotado autocontenido. Reglas de importación,
todas verificadas por `tests/architecture/boundaries.spec.ts`:

| Desde | Puede importar | Nunca |
|---|---|---|
| `pages/`, `layouts/`, `components/` | `@domains/<x>` (**solo el `index.ts`**) | internos de un slice |
| `@domains/<x>` | `@shared/**`, `@config/**`, `@components/**` | internos de `@domains/<y>` |
| `@domains/<x>/server/**` | `@shared/env/server`, `@shared/**` | código de cliente |
| código de cliente | `@shared/env/client` | `@shared/env/server`, `**/server/**`, stores en `.vue` sin `client:*` |
| `@shared/**` | sí mismo, `@config/**` | `@domains/**` |

Comunicación entre slices, en este orden de preferencia:

1. **La URL es el contrato.** Cambiar de agente o de hilo es navegar
   (`@config/routes`), no emitir eventos. `transition:persist` mantiene la isla
   viva a través del salto.
2. **Bus de dominio** (`@shared/bus/domain-events`): solo señales momentáneas,
   solo eventos (`agent:run-finished`), nunca comandos ni estado.
3. **Pinia** (`src/stores/`) para estado global de verdad.
4. props ↓ / emits ↑ dentro del mismo slice.

## Estado: por qué Pinia pasa por `appEntrypoint`

Cada isla Vue de Astro es su **propia** `createApp()`: no hay árbol común, no hay
`provide/inject` entre islas. `@astrojs/vue` resuelve eso con la opción
`appEntrypoint`, que ejecuta `setup(app)` sobre la App de **cada** isla antes de
montarla (véase `src/vue-app.ts` y `astro.config.mjs`).

- El `pinia` de `src/stores/pinia.ts` es un **singleton de módulo**: todas las islas
  comparten el mismo objeto, y por tanto el mismo estado.
- **Regla dura:** stores y `useQuery` solo dentro de islas hidratadas
  (`client:*`). Un `.vue` **sin** directiva se renderiza en el servidor, y allí un
  singleton de módulo mezclaría estado entre peticiones de usuarios distintos.
- Estado ligero compartido entre dos islas hermanas: `createSharedComposable`
  de `@vueuse/shared`, no un store nuevo.
- Disparador para **añadir un store**: ≥3 islas leen/escriben el mismo estado **y**
  debe sobrevivir a la navegación sin `transition:persist` **y** conviene verlo en
  devtools. Con dos de tres, no.
- Disparador para **colada (`useQuery`)**: una lectura consumida por ≥2 vistas **y**
  con semántica de frescura/invalidación.

## Política de hidratación

| Superficie | Directiva |
|---|---|
| Isla de chat (transcript + composer) | `client:only="vue"` + `transition:persist` + `slot="fallback"` |
| Sidebar de hilos | `client:idle` |
| Listas por debajo del pliegue | `client:visible` |
| UI solo para móvil | `client:media="(max-width: 60rem)"` |
| Datos por-request sin JS | `server:defer` |
| Chrome, navegación, paneles | `.astro` sin directiva (cero JS) |

Prohibido `client:load` en `agent-chat`: paga el chunk del cliente del proveedor
antes de que exista un prompt.

## Rendimiento del streaming

1. `shallowRef` para la lista de mensajes; mutación solo por reemplazo inmutable.
   Un `ref([...])` profundo re-proxyea todo el transcript por token.
2. El texto en vuelo es un búfer plano drenado por `@shared/streams/token-batcher`
   (una escritura por frame) y **promocionado** a mensaje al cerrar. No es un
   mensaje en la lista mientras llega.
3. `markRaw` sobre clientes HTTP, `Response`, `ReadableStream`, `AbortController` y
   payloads opacos de tool-call. Vue no debe hacer proxy de un stream.
4. El cliente del proveedor de agentes se importa **solo** con `await import()`
   dentro de `transport/mastra.ts`. Ningún otro archivo del repo lo nombra.
   Se comprueba con `npm run verify:bundle`.

## El BFF

- Toda la lógica vive en `src/domains/<slice>/server/`; `src/pages/api/**` son
  envoltorios de tres líneas. Así los handlers se prueban sin arrancar Astro.
- **Los streams nunca se parsean en el servidor.** `agent-rpc` reenvía el cuerpo
  verbatim. **El JSON siempre se normaliza en el servidor** antes de llegar al
  navegador (recortando instrucciones de sistema, costos e ids internos).
- Secretos: solo `src/shared/server/upstream.ts` lee `@shared/env/server`. La regla
  es estructural: **cualquier módulo de `shared` que toque el servidor vive bajo
  `src/shared/server/`**, igual que en los slices. Así el test de fronteras decide
  por ruta, no por nombre de archivo.
- No hay `src/middleware.ts` a propósito: el gateway usa un helper explícito
  (`withGateway`) para no enredar el encadenamiento con respuestas en streaming.
- No crear `src/fetch.ts`: Astro 7 lo reserva para advanced routing.

## Variables de entorno

El contrato está en `env.schema` de `astro.config.mjs`. Cambiarlo exige
`npx astro sync`, documentar la variable en `.env.example` con su etiqueta
`[server]/[public]/[secret]`, y tocar **solo** uno de los dos barriles
(`@shared/env/client` o `@shared/env/server`). `HOST`/`PORT` no van en el schema:
los lee `dist/server/entry.mjs` directamente.

**Trampa verificada de `astro:env`:** una variable con `access: 'public'` se
**inlinea en el momento del build**, incluso declarada `context: 'server'`. Por
eso `MASTRA_URL` y los timeouts son `access: 'secret'`: no por ser credenciales,
sino porque necesitan resolverse **en el arranque del proceso** (web con env
distinta por entorno, y el paquete de Electron, que no se recompila por cliente).
Si alguien añade una variable de servidor nueva, que no la ponga `public`.

## Lint, tipos y estilo

- `astro/tsconfigs/strictest` → `verbatimModuleSyntax`: **todo import de tipos con
  `import type`**. También `noUncheckedIndexedAccess` y `exactOptionalPropertyTypes`,
  que obligan a escribir `field?: string | undefined` y a no indexar sin guarda.
- Tailwind v4: no existe `tailwind.config.js`. Los tokens se declaran en el
  `@theme` de `src/styles/global.css`, que es la **única** fuente de colores,
  radios y sombras. `src/config/ui/tokens.ts` solo guarda lo que JS necesita.
- Variantes con `@shared/ui/variants` (`cn` + `variants`), no con CVA: hay que
  poder llamarlas igual desde el frontmatter de un `.astro`.
- Nombres de slot en todo el repo: `default`, `header`, `footer`, `actions`,
  `aside`, `fallback`, `leading`, `trailing`.
- UI y catálogos de error en **español**. Un código de error sin mensaje en
  `<scope>.e.ts` no puede llegar a la pantalla.
- **Nunca escribir un glob `**/` dentro de un comentario `/** ... */`**: la
  secuencia `*/` cierra el bloque y el resto de la frase se parsea como código.
  ESLint lo reporta como `no-unused-expressions` en una línea de comentario, lo
  que desconcierta la primera vez. Para nombrar rutas comodín en un JSDoc, usar
  la forma larga (`carpeta server de un slice`) o un solo `*`.

## Astro 7: lo que rompe si uno viene de Astro 3/4

- Compilador Rust: **no corrige HTML inválido**. Tags que cierran, `<p>` sin `<div>`
  dentro.
- `compressHTML: 'jsx'`: se elimina el whitespace entre hermanos inline. Si dos
  `<span>` pegan, separar con `{" "}`.
- No existe `<Meta framework="vue">`: el `<head>` se escribe a mano.
- `astro check` sí necesita `@astrojs/check` instalada.
- `output: 'hybrid'` ya no existe: `output: 'server'` + `export const prerender = true`
  por página.
- `@astrojs/db` eliminado.

## Dependencias: estado conocido

- `@mastra/client-js` **se instala sin `--legacy-peer-deps`** (su único peer es
  `zod`), pero arrastra `@mastra/core` como dependencia.
- `npm audit` reporta 1 vulnerabilidad **low** transitiva e inevitable:
  `@ai-sdk/provider-utils@2.2.8`, fijado en exacto por `@ai-sdk/ui-utils@1.2.11`,
  con advisory de consumo de recursos. `npm audit fix --force` retrocedería
  `@mastra/client-js` a 1.8.4 (breaking). **No se pisa con overrides**: un salto de
  major en ese paquete cambia el parser que usa `processDataStream`. Mitigación
  real: el cliente está aislado en `transport/mastra.ts` y `@shared/streams/sse.ts`
  (`readSseLines`) implementa el mismo contrato `AgentTransport` sin él.
- `eslint-plugin-jsx-a11y` **no** se instala: su peer llega hasta ESLint 9. Por eso
  no se usa `astro.configs['jsx-a11y-recommended']`.

## Verificación

`npm run all` (lint, check, test, build) es obligatorio. Además, según lo tocado:

- `npm run verify:bundle` → el cliente del proveedor solo en chunk diferido.
- `npm run verify:relay` → el relay reenvía byte a byte contra un backend de agentes
  falsificado (`tests/_fixtures/sse-stub.mjs`), y comprueba que no se filtran cookies,
  que se fuerza `no-transform` y que `checkOrigin` sigue bloqueando el cross-site.
- `npm run verify:electron` → abre Chromium, levanta el servidor construido, verifica
  el `contextBridge` del preload, **escribe un prompt y espera a que la respuesta se
  asiente en pantalla**, y deja `smoke/electron-chat.png`. Es la única prueba de lo
  que el usuario ve: ningún test de Vitest puede sustituirla.

## Definition of Done

- [ ] `npm run all` en verde (lint, `astro check`, tests, build).
- [ ] `npm run verify:bundle`: el cliente del proveedor fuera del grafo inicial.
- [ ] Nada en `domains/x` importa internos de `domains/y`; ningún módulo de cliente
      importa `@shared/env/server` ni `@shared/server/*` (test de fronteras).
- [ ] Ningún secreto ni host del upstream en `dist/client/**` ni en el HTML generado.
- [ ] La app es navegable y usable con `PUBLIC_AGENT_TRANSPORT=mock` y **sin backend**.
- [ ] El stream sobrevive a la navegación (`transition:persist`) y se aborta al
      desmontar la isla.
- [ ] Todo error visible sale de un catálogo `<scope>.e.ts`, en español.
- [ ] `.env.example` documenta cada variable nueva con su etiqueta.
- [ ] `AGENTS.md` del directorio tocado actualizado.
- [ ] Si se tocó `electron/` o configs de build: `npm run verify:electron` y, para
      un cambio de empaquetado, `npm run electron:build:linux`.

## Qué mirar antes de culpar al código

Tres fallos que se ven raros desde fuera:

- Isla que no hidrata o puente `undefined` → `electron/AGENTS.md` (preload CJS, sin
  `require` propios, sin getters).
- Transcript con burbujas vacías o `[object Object]` → ADR-002 (refs anidados no se
  desenvuelven; hay que desestructurar en el componente).
- `403` en un POST desde una herramienta CLI → `security.checkOrigin` de Astro
  trabajando: falta el header `Origin` same-origin.
