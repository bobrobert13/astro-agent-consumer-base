# ADR-002 — Composable primero; Pinia solo cuando salta el disparador

**Estado:** aceptado · **Fecha:** 2026-09-15 · **Implementación:**
`src/vue-app.ts`, `src/stores/pinia.ts`, `src/stores/app-shell.ts`,
`src/domains/agent-chat/composables/`

## Contexto

En Astro **no hay una app raíz**: cada isla Vue es su propia `createApp()`. No hay
árbol común, no hay `provide/inject` entre islas, y `app.use(pinia)` habría que
repetirlo por isla. La pregunta de arquitectura es dónde vive el estado cuando el
contenedor natural (la app) no existe.

## Decisión

Por defecto, **composable**. El estado se comparte entre islas porque todas importan
el mismo grafo de módulos de Vite, así que un composable envuelto en
`createSharedComposable` de `@vueuse/shared` da un singleton por documento sin
crear una capa nueva.

Pinia entra igual en el boilerplate, pero con un disparador explícito y **un solo
store** (`app-shell`):

| Disparador de un store nuevo (los tres a la vez) | Disparador de colada (los dos a la vez) |
|---|---|
| ≥3 islas leen/escriben el mismo estado | una lectura consumida por ≥2 vistas |
| debe sobrevivir a la navegación sin `transition:persist` | con semántica de frescura / invalidación |
| conviene inspeccionarlo en devtools | |

## Cómo se instala Pinia en las islas

`@astrojs/vue` ofrece `appEntrypoint`: un módulo con `export default async (app) =>`
que se ejecuta sobre la App de **cada** isla antes de `app.mount()`
([documentación oficial](https://docs.astro.build/en/guides/integrations-guide/vue/#appentrypoint)).
Ahí se instalan Pinia y colada una sola vez, con el `pinia` de
`src/stores/pinia.ts` como singleton de módulo → las islas comparten estado.

## Consecuencias

- El boilerplate no multiplica boilerplate: nada de `app.use()` por componente.
- **Regla dura**: stores y `useQuery` solo dentro de islas hidratadas (`client:*`).
  Un `.vue` sin directiva se renderiza en el servidor, y allí un singleton de
  módulo mezclaría estado entre peticiones de usuarios distintos. La corta
  `tests/architecture/boundaries.spec.ts`.
- El transcript en vuelo **no** es estado global: lo posee el composable del chat
  (`useAgentChat`) y lo pinta la vista. Evita el modo "estado global por defecto",
  que es como un store acaba siendo el basurero de la app.

## Lección verificada en navegador

`createSharedComposable` devuelve un **objeto plano con refs dentro**, y Vue solo
desenvuelve los refs de nivel superior del `setup()`. Escribir `chat.messages` en
una plantilla entrega el `Ref`: `v-for` itera sus claves internas y el resultado es
un transcript de burbujas vacías con un `[object Object]` en el composer. Se
soluciona **desestructurando en el componente** (hoy lo hacen los del estudio, que
  consumen `useAgentChat`), no envolviendo
en `reactive()` — eso volvería a proxyear la lista de mensajes y anularía el
`shallowRef`.

Ningún test de Vitest veía esto: lo cazó `npm run verify:electron`.
