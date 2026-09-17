# AGENTS.md — `src/shared/`

El kernel. Todo lo que hay aquí es **agnóstico de dominio**: si un módulo necesita
saber qué es un agente, pertenece a una slice.

## Regla de dependencia

`shared` no importa `@domains/**`. Nunca. Si hace falta algo de un slice, el
consumer está mal ubicado. Lo comprueba
`tests/architecture/boundaries.spec.ts`.

## Mapa

| Módulo | Para qué existe |
|---|---|
| `result/result.pattern.ts` | Contrato `Result<T>` de todo lo asíncrono del repo. Cero imports. |
| `http/http-client.ts` | `fetch` con timeout y guard de JSON, devolviendo `Result`. Sin axios. |
| `http/endpoints.ts` | `createEndpoints(prefix)` y `query()`: URLs deterministas y claves de caché estables. |
| `env/client.ts` · `env/server.ts` | **Dos barriles separados a propósito**: importar `astro:env/server` en código del navegador rompe el build; dividir el acceso hace el error imposible por estructura. |
| `server/upstream.ts` · `server/fetch-json.ts` · `server/upstream-health.ts` | Lo que toca el backend de agentes. Cualquier módulo de `shared` que hable con el servidor vive bajo `server/`, y el test de fronteras lo exige por ruta. |
| `streams/sse.ts` | Cabeceras del relay y watchdog de silencio. `readSseLines()` no tiene consumidor hoy: era el plan B del cliente anterior (ADR-007). |
| `ui/variants.ts` | `cn()` + `variants()`, llamables igual desde `.astro` que desde `.vue`. |
| `../config/ui/tokens.ts` | Solo constantes que JS necesita (duraciones, teclas, claves). **Ningún color ni tamaño duplicado**: la fuente es el `@theme` de `styles/theme.css`. |
| `bus/domain-events.ts` | Señales momentáneas entre slices. Solo eventos, nunca comandos ni estado. |
| `desktop/detect.ts` · `desktop/types.ts` | Puente de escritorio y su degradación en web. |
| `observability/report-error.ts` | Costura única de reporte. Aquí se enchufa un APM, no en cada slice. |

## Lo que se rechazó, y qué lo haría entrar

| Módulo | Disparador para crearlo |
|---|---|
| `shared/stores/` | ya existe `src/stores/` para lo global; un wrapper de Pinia aquí solo ocultaría el disparador |
| `shared/i18n/` | un segundo idioma real (los catálogos viven en `<scope>.e.ts`) |
| `shared/storage/` | un segundo consumidor de la misma clave de `localStorage` |
| `shared/testing/` | dos suites necesitando la misma fixture |
| `shared/router/` | no hay router propio: la URL es el contrato |
| `shared/auth/` | una UI de login propia |
| `shared/domain/mappers.ts` | los mapeos `toDomain`/`fromApi` son del slice |

## Estilo

- Comentarios de archivo con `@file` / `@description` en español, explicando el
  **por qué**, no el qué.
- Con `verbatimModuleSyntax`, todo import de tipos va con `import type`.
- Con `noUncheckedIndexedAccess` y `exactOptionalPropertyTypes`, indexar pide
  guarda y los opcionales se declaran `?: T | undefined`.
- Dentro de un comentario `/** … */`, **no** escribir un glob `**/`: el `*/` cierra
  el bloque y el resto se parsea como código.
