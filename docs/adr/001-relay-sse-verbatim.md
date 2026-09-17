# ADR-001 — El relay del BFF reenvía el SSE verbatim, sin re-encodear

**Estado:** aceptado · **Fecha:** 2026-09-15 · **Implementación:**
`src/domains/agent-chat/server/stream-relay.ts`, `src/pages/api/agent-chat.ts`

> **Parcialmente sustituido por [ADR-007](./007-ai-sdk-ui-transport.md).** La decisión
> sigue en pie —el BFF copia bytes y no parsea la respuesta—, pero la ruta es
> `/api/agent-chat` y quien la consume ya no es `@mastra/client-js`. Todo lo que este ADR
> dice sobre `StreamChunk` y `translateChunk` describe el diseño anterior.

## Contexto

El navegador no debe conocer la dirección ni la credencial del backend de agentes,
así que todo el tráfico pasa por el servidor Astro. Ahí surge la decisión: ¿el BFF
**interpreta** el stream del proveedor y lo vuelve a emitir en un formato propio, o
lo **copia** byte a byte?

## Decisión

Copia. `agent-rpc` reescribe la ruta, inyecta la credencial, ajusta cabeceras,
impone timeouts, propaga la cancelación — y no toca el cuerpo.

## Consecuencias

**A favor**

- No se reimplementa el contrato de wire format de un SDK ajeno
  (`processDataStream`, su `[DONE]`, sus errores y su reconexión). Duplicar un
  contrato que no controlas es deuda garantizada: en cuanto el proveedor cambia un
  frame, el BFF miente.
- Cero `JSON.parse` + `JSON.stringify` **por token** en el proceso que sirve la UI.
  A 60–120 tokens/s por conversación, eso es CPU y latencia añadidas por byte.
- El relay es agnóstico del proveedor: si mañana aparece una ruta nueva
  (`/api/agents/:id/continue`), la isla la usa sin tocar el BFF.
- Verificable de forma contundente: `npm run verify:relay` compara la respuesta
  directa del upstream con la reenviada y exige igualdad byte a byte.

**En contra, aceptadas**

- El navegador recibe el formato del proveedor, así que el único sitio que lo
  conoce es `transport/mastra.ts`. Se compensa con el contrato `StreamChunk`: el
  resto de la app no sabe qué es un `text-delta`.
- Un error interno del backend puede llegar como frame `error` con texto de
  desarrollador. Se resuelve en la capa de presentación: `translateChunk` lo
  traduce a un `code`, `chat.e.ts` lo convierte a español y el texto crudo solo se
  registra (`reportError`), nunca se pinta.

## Dónde sí se reescribe

En el JSON. `/api/agents`, `/api/sessions` y `/api/agents/:id/config` normalizan y
**recortan** (`normalize-agent-run.ts`): instrucciones de sistema, costos e ids
internos no viajan al navegador. Regla de la casa: **los streams nunca se parsean
en el servidor; el JSON siempre se normaliza en el servidor.**

## Verificación empírica

Con el backend de agentes en marcha (`mastra-agente-ejemplo`, Mastra 1.29), el
cliente del SDK pide `POST /api/agent-rpc/agents/<id>/stream`, el relay lo traduce
a `POST <MASTRA_URL>/api/agents/<id>/stream` —ruta que sí existe— y el stream
devuelto llega idéntico (900 bytes directos, 900 reenviados, misma secuencia de
frames).
