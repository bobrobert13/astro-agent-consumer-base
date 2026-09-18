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
`communication-agent` — el default del slice es `communication-agent`, la única
fuente es `DEFAULT_AGENT_ID` en `@config/app`; la URL lo puede pisar con `?agente=`).

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
| Estudio de chat (rail, hilo, panel de contexto, capas) | `client:only="vue"` + `transition:persist` + `slot="fallback"` |
| Barra de navegación (`NavigationProgress`) | `client:only="vue"` + `transition:persist`, una vez en `AppLayout` |
| Listas por debajo del pliegue | `client:visible` |
| UI solo para móvil | `client:media="(max-width: 60rem)"` |
| Datos por-request sin JS | `server:defer` |
| Chrome, navegación, paneles | `.astro` sin directiva (cero JS) |

**`client:idle` no se usa para contenido de página, y está medido**: se probó en la
pantalla de ajustes (ya retirada) para hidratar sin esperar al observer, y
`requestIdleCallback` se difiere
mientras la página no está visible, así que con la ventana en segundo plano la isla
no hidrataba nunca (el `Select` de ajustes no llegaba a abrirse; lo cazó
`verify:electron`). Donde importa que la isla responda al primer gesto, `visible`.

**Datos que la isla necesita nada más nacer se resuelven en el servidor y viajan
como props** (`/settings` pasa el catálogo *y* la config del agente activo). Una
isla que tiene que hidratar, pedir y esperar antes de ser usable llega tarde por
diseño: el usuario ve controles deshabilitados y lo lee como que la app va lenta.
Si la lectura del servidor puede tardar, se le pone presupuesto (`AbortSignal`) y
la isla cae a pedirlo ella misma si se agota.

Prohibido `client:load` en el estudio: la isla es `client:only` porque su núcleo es
el AI SDK, que solo existe en el navegador, y porque el chrome no aporta nada que
merezca renderizarse en servidor (ADR-007). El porqué largo, en
`src/domains/chat-studio/AGENTS.md`.

## Rendimiento del streaming

1. La lista de mensajes es la del AI SDK (un `shallowRef` por dentro): se muta solo
   por reemplazo inmutable, nunca en profundidad. Ver ADR-007.
2. El texto en vuelo **no** es un mensaje de la lista: `adapt-ui-messages.ts` saca el
   último globo del asistente de `messages` y lo expone como `streamingText`; al
   cerrar, entra en la lista con todas sus piezas (texto y herramientas). Es lo que
   mantiene barato el scroll, porque `studio.memo.ts` memoriza los globos cerrados.
3. `markRaw` sobre clientes HTTP, `Response`, `ReadableStream`, `AbortController` y
   payloads opacos de tool-call. Vue no debe hacer proxy de un stream.
4. **El vocabulario del AI SDK solo se conoce en `agent-chat/ai/`** —y en
   `useAgentChat`, que es quien monta el composable—. Ningún componente `.vue` importa
   `ai` ni `@ai-sdk/vue`: la vista consume `ChatMessage`. Lo comprueba
   `tests/architecture/boundaries.spec.ts`.

## El BFF

- Toda la lógica vive en `src/domains/<slice>/server/`; `src/pages/api/**` son
  envoltorios de tres líneas. Así los handlers se prueban sin arrancar Astro.
- **Los streams nunca se parsean en el servidor.** `agent-chat` reenvía la
  **respuesta** a la ruta de chat del backend byte a byte, sin re-encodear. **El JSON
  siempre se normaliza en el servidor** antes de llegar al navegador (recortando
  instrucciones de sistema, costos e ids internos).
- **El cuerpo de la petición sí se abre, y en un solo sitio**
  (`agent-chat/server/relay-body.ts`), por tres motivos que no admiten otra vía: el
  límite de tamaño, la identidad de memoria —que **no puede decidirla el navegador**
  (`session-scope.ts`)— y el destino del reenvío, que también sale de él (el `agentId`
  de una ejecución de chat). Solo se reescriben `memory.resource` y `memory.thread`; el
  resto del cuerpo se devuelve intacto. Leer ADR-006 antes de tocar el relay.
- **El hilo se acota SIEMPRE al resource** (`scopeThread()` → `<hilo>-<resource>`), no
  solo el marcador `nuevo`: Mastra ata cada hilo a un resource y reusar un id literal
  con otro dueño (cookies nuevas, otro navegador, `localhost` vs `127.0.0.1`) es un
  `500 Internal Server Error` reproducido contra el backend real. El mismo navegador
  conserva su conversación turno a turno; ningún otro la comparte (ADR-006).
- **`AGENT_CONNECT_TIMEOUT` (30 s) es el presupuesto hasta las PRIMERAS CABECERAS del
  upstream, y el backend las escribe tarde a propósito**: antes corre su memoria, su
  scope guard y su detector de inyección (llamadas al modelo) y el primer token
  —medido: 9-20 s con DeepInfra—. Bajarlo corta turnos sanos con un 502
  `connect_timeout` que miente sobre la causa. `AGENT_IDLE_TIMEOUT` (60 s) es otra
  cosa: silencio máximo a mitad de stream, medido entre chunks.
- **Los fallos del relay se traducen al catálogo, nunca al mensaje genérico.** El AI
  SDK entrega el *cuerpo* de la respuesta de error como `message`; `relayErrorFrom()`
  (`chat.e.ts`) abre ese JSON (`{"ok":false,"error":{statusCode,code}}`) y
  `resolveStreamErrorText` decide código → estado HTTP → genérico, sin pintar jamás el
  texto crudo. Antes, todo 502/413 degradaba al genérico y el motivo real no llegaba
  ni a la pantalla ni al log del servidor.
- **Los handlers del BFF validan con su propio schema, no con el del proveedor.**
  `chatRequestSchema` describe el cuerpo que construye **nuestro** cliente
  (`prepareSendMessagesRequest`): un `agentId` estrecho —se interpola en una ruta, así
  que cierra el traversal en el origen— y que haya mensajes. Las piezas de cada
  `UIMessage` quedan opacas a propósito, porque su forma evoluciona con la versión del
  SDK. `runRequestSchema` describe otro contrato y hoy no tiene consumidor: es deuda
  declarada en ADR-007, no una segunda vía viva.
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

**Trampa verificada de `astro:env` (dos partes):**

1. **La clave del schema ES el nombre literal de la variable.** Astro la busca con
   `loadEnv(mode, dir, '')` y hace `loadedEnv[key]`, así que una variable
   `access: 'public'` se declara como `PUBLIC_ALGO` —con prefijo— y es
   `@shared/env/client` quien la re-exporta sin prefijo. Sin el prefijo, la clave
   no existe en el entorno, la validación no ve nada y **Astro inyecta el
   `default` en cada build, en silencio**: así estuvo muerto el interruptor de
   transporte. El stub `tests/_stubs/env-client.ts` refleja los nombres del schema.
2. Una variable con `access: 'public'` se **inlinea en el momento del build**,
   incluso declarada `context: 'server'`. Por
   eso `MASTRA_URL` y los timeouts son `access: 'secret'`: no por ser credenciales,
   sino porque necesitan resolverse **en el arranque del proceso** (web con env
   distinta por entorno, y el paquete de Electron, que no se recompila por
   cliente). Si alguien añade una variable de servidor nueva, que no la ponga
   `public`.

## Lint, tipos y estilo

- `astro/tsconfigs/strictest` → `verbatimModuleSyntax`: **todo import de tipos con
  `import type`**. También `noUncheckedIndexedAccess` y `exactOptionalPropertyTypes`,
  que obligan a escribir `field?: string | undefined` y a no indexar sin guarda.
- Tailwind v4: no existe `tailwind.config.js`. Los tokens se declaran en el
  `@theme` de `src/styles/theme.css`, que es la **única** fuente de colores,
  radios, sombras, **escala tipográfica, ritmo y medidas**. `global.css` importa
  ese archivo y se queda con el documento base y la rejilla del shell.
  `src/config/ui/tokens.ts` solo guarda lo que JS necesita.
- La escala de texto es fluida (`clamp()`) y cada token lleva dentro su
  interlineado, peso y tracking: un titular es `text-title`, no cuatro utilidades.
  `theme.css` estiliza además `h1`…`h6`, `p`, `small` y `code` en `@layer base`,
  así que un elemento desnudo ya se ve bien. El catálogo está en
  `docs/lenguaje-visual.md` y lo vigila `tests/architecture/design-tokens.spec.ts`
  (falla con un `text-[13px]`, un `text-white` o un color literal).
- Variantes con `@shared/ui/variants` (`cn` + `variants`), no con CVA: hay que
  poder llamarlas igual desde el frontmatter de un `.astro`. **Excepción:** los
  componentes generados por shadcn-vue en `src/components/ui/**` usan su propio
  `cn` (`src/lib/utils.ts`, clsx + tailwind-merge) y CVA; ver la sección
  shadcn-vue. No unificar los dos `cn`: el de `variants.ts` concatena sin merge
  y sus tests fijan esa semántica.
- Nombres de slot en todo el repo: `default`, `header`, `footer`, `actions`,
  `aside`, `fallback`, `leading`, `trailing`, `empty`, `head`, `layer`. Un slot
  nuevo se añade a esta lista **y** al componente, no al consumidor. `layer` es el
  de `AppLayout`: una capa a pantalla completa que se pinta **después** del
  estudio, para que una vista como la de conectores se abra encima sin desmontar
  la isla del chat.
- UI y catálogos de error en **español**. Un código de error sin mensaje en
  `<scope>.e.ts` no puede llegar a la pantalla.
- **Nunca escribir un glob `**/` dentro de un comentario `/** ... */`**: la
  secuencia `*/` cierra el bloque y el resto de la frase se parsea como código.
  ESLint lo reporta como `no-unused-expressions` en una línea de comentario, lo
  que desconcierta la primera vez. Para nombrar rutas comodín en un JSDoc, usar
  la forma larga (`carpeta server de un slice`) o un solo `*`.

## shadcn-vue

Base instalada y verificada (CLI `shadcn-vue`, registry `new-york`, reka-ui).
Los componentes generados viven en `src/components/ui/**` — la ubicación que ya
reservaba `src/components/AGENTS.md` para primitivas `.vue` compartidas.

- **Añadir un componente:** `npx shadcn-vue@latest add <nombre>`. El CLI lee
  `components.json` (aliases `@/...`, CSS `src/styles/global.css`) y respeta el
  tsconfig. No ejecutar `init` de nuevo: reescribiría `global.css` con la paleta
  neutral por defecto.
- **Sin paleta duplicada:** las variables semánticas de shadcn (`--background`,
  `--primary`, `--border`…) apuntan a las `--aac-*` de toda la vida en el
  `:root` de `global.css`. Reasignar un token de concepto mueve a la vez los
  componentes propios y los del registry. `.dark` y la media query siguen
  siendo la única fuente del modo oscuro.
- **Variante `dark` híbrida** (`@custom-variant dark` en `global.css`): aplica
  con la clase `.dark` (tema forzado por el store) **y** con
  `prefers-color-scheme: dark` salvo `.light` explícito. Es lo que permite que
  los `dark:` del registry y los del repo converjan.
- `src/lib/utils.ts` es territorio shadcn (lo genera el CLI); el resto del repo
  sigue con `@shared/ui/variants`.
- ESLint exime `src/components/ui/**` de `vue/multi-word-component-names`: los
  nombres los fija el registry (`Button.vue`), renombrar rompería `add`/`diff`.
- **Dos vocabularios, una paleta**: el código escrito a mano usa los tokens de
  concepto (`text-ink-muted`, `bg-elevated`, `text-on-brand`); los nombres
  semánticos del registry (`text-muted-foreground`, `bg-accent`) se usan **solo**
  dentro de `src/components/ui/**`. Son las mismas variables por debajo, pero
  mezclarlas en un archivo hace ilegible qué cambia el tema.
- Consumidores reales: el estudio (`chat-studio/components/**`) usa `Button`,
  `Textarea`, `ScrollArea`, `Collapsible`, `Dialog`, `DropdownMenu`, `Alert`,
  `Badge`, `Skeleton`, `Slider`, `Tooltip` y `Toaster`; los conectores
  (`connectors/**`) usan `Tabs`, `Card`, `Badge`, `Input`, `Button`, `Switch`,
  `Select`, `Separator`, `Alert`, `Skeleton` y `Dialog`. `IslandFallback` monta
  `Skeleton` en un `.astro` sin directiva (cero JS).
- **Las pestañas del registry se usan tal cual.** El estudio se maqueta las suyas
  porque necesita un indicador inferior y un contador en píldora, y eso obligaría a
  pelear con las clases internas; la vista de conectores quería justo la forma que
  el registry trae, así que solo ajusta maquetación (el ancho de la barra y el aire
  sobre el contenido).
- Las primitivas `.astro` propias quedaron en `IslandFallback`: el resto se retiró
  con las pantallas heredadas. Un componente nuevo se escribe en el slice que lo usa,
  o se promociona a `src/components/ui/*.vue` cuando lo pidan dos.
- Un `.vue` del registry en un `.astro` sin directiva se renderiza en el servidor
  (cero JS); los interactivos (Dialog, Dropdown…) exigen isla hidratada.
- **CSP:** `security.csp` lleva `style-src 'self' 'unsafe-inline'` y deja
  `script-src` con hashes. Motivo: los hashes no cubren nunca un atributo
  `style=""` (lo dice Chromium al negarlo) y el SSR de reka-ui/vue-sonner va lleno
  de ellos. En dev no se ve, porque el CSP está apagado por HMR, así que lo
  sostiene `npm run verify:electron`. Leer ADR-004 antes de tocar `security.csp`,
  y correr el smoke al añadir dependencias de UI.

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

- **`ai` y `@ai-sdk/vue` van pinneados en exacto** (`7.0.100` / `4.0.100`) porque
  `@ai-sdk/vue` fija su `ai` en la misma versión exacta: son lockstep, y poner rango en
  uno solo deja la otra mitad en manos del resolvedor. Subirlos es mover los dos a la
  vez. Ver ADR-007.
- `@mastra/client-js` **ya no es dependencia del cliente**: el navegador habla con el
  BFF y el BFF con Mastra. Con ella se fue el advisory low de
  `@ai-sdk/provider-utils@2.2.8` que este archivo documentaba como inevitable.
- `eslint-plugin-jsx-a11y` **no** se instala: su peer llega hasta ESLint 9. Por eso
  no se usa `astro.configs['jsx-a11y-recommended']`.
- Stack shadcn-vue instalado: `reka-ui`, `class-variance-authority`, `clsx`,
  `tailwind-merge`, `tw-animate-css` y `@lucide/vue` (iconos del registry). El
  CLI (`npx shadcn-vue@latest add …`) detecta Astro y Tailwind v4 por sí solo;
  `components.json` fija aliases y el CSS. Ver la sección **shadcn-vue**.

## Verificación

`npm run all` (lint, check, test, build) es obligatorio. Además, según lo tocado:

- `npm run test` corre en dos proyectos: `node` (kernel, servicios, BFF) y `dom`
  (jsdom + `@vue/test-utils`, para montar componentes). El plugin de Vue del
  proyecto `dom` es obligatorio: sin él Vite parsea el `.vue` como JS. Cubre, entre
  otras cosas, el estudio completo contra el transporte mock
  (`tests/dom/studio-chat.spec.ts`) y las dependencias de `v-memo` del globo en
  vuelo (`tests/dom/studio-message.spec.ts`).
- `tests/architecture/design-tokens.spec.ts` es el guardián del lenguaje visual:
  falla con un tamaño arbitrario, un blanco literal o un color escrito a mano.
- `npm run verify:bundle` → el cierre estático de la isla no arrastra código de
  servidor ni secretos, e informa de su tamaño. El AI SDK **sí** vive ahí: es el núcleo
  de la isla, no un proveedor a diferir (ADR-007).
- `npm run verify:relay` → el relay reenvía byte a byte contra un backend de agentes
  falsificado (`tests/_fixtures/sse-stub.mjs`), y comprueba que no se filtran cookies,
  que se fuerza `no-transform`, que la sonda de salud alcanza el backend, que sin
  `agentId` se responde 400 sin reenviar y que `checkOrigin` sigue bloqueando el
  cross-site.
- `npm run verify:electron` → abre Chromium, levanta el servidor construido, verifica
  el `contextBridge` del preload, **escribe un prompt y espera a que la respuesta se
  asiente en pantalla**, abre el panel de contexto y un desplegable del estudio contra
  el CSP de producción y deja `smoke/electron-chat.png`. Es la única prueba de lo que el usuario ve: ningún
  test de Vitest puede sustituirla. Es también el guardián del CSP (ADR-004), porque
  corre la build y no dev.
  En Linux sin `chrome-sandbox` SUID-root el lanzador desactiva el sandbox del
  renderer y avisa; sin ese paso Electron abortaría con SIGTRAP antes de la primera
  comprobación (`scripts/lib/electron-sandbox-env.mjs`).

## Definition of Done

- [ ] `npm run all` en verde (lint, `astro check`, tests, build).
- [ ] `npm run verify:bundle`: el grafo inicial de la isla sin código de servidor ni secretos.
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

Cuatro fallos que se ven raros desde fuera:

- Isla que no hidrata o puente `undefined` → `electron/AGENTS.md` (preload CJS, sin
  `require` propios, sin getters).
- Transcript con burbujas vacías o `[object Object]` → ADR-002 (refs anidados no se
  desenvuelven; hay que desestructurar en el componente).
- `403` en un POST desde una herramienta CLI → `security.checkOrigin` de Astro
  trabajando: falta el header `Origin` same-origin.
- Consola llena de avisos de CSP **solo en la build**, y en dev limpia: es la
  política rechazando atributos `style=""`, ADR-004. El que lo reproduce es
  `npm run verify:electron`; `npm run dev` no puede.
