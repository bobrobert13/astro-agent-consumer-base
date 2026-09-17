# ADR-003 — Mock-first: el boilerplate arranca sin backend

**Estado:** aceptado · **Fecha:** 2026-09-15 · **Implementación:**
`src/domains/agent-chat/ai/`

> **Parcialmente sustituido por [ADR-007](./007-ai-sdk-ui-transport.md).** La decisión
> sigue en pie —mock y real intercambiables, decididos por `PUBLIC_AGENT_TRANSPORT`—,
> pero el contrato ya no es `AgentTransport` sino el `ChatTransport` del AI SDK, y el
> transporte real ya no se carga en diferido: el SDK es el núcleo de la isla.

## Contexto

Un boilerplate que no arranca sin levantar un backend de agentes se prueba una vez
y se copia tres. Y el caso de uso central —un chat que streamanea— es justamente el
que más dependencias externas necesita (proveedor de modelos, memoria, claves).

## Decisión

Un contrato propio y dos implementaciones intercambiables:

```ts
interface AgentTransport {
  stream(input, { signal, onChunk }): Promise<Result<void>>;
  health(): Promise<Result<TransportHealth>>;
}
```

`transport/mock.ts` emite la misma secuencia de chunks que el proveedor real, con
ritmo humano, un `tool-call` en medio y dos comandos de prueba (`/error`, `/slow`).
`transport/mastra.ts` habla con el backend. `PUBLIC_AGENT_TRANSPORT` decide, y el
real se carga con `await import()` para que no pese en el chunk inicial.

## Consecuencias

- **Desarrollo y demo sin nada levantado.** `npm install && npm run dev` y el chat
  responde.
- **El contrato es la prueba de que la arquitectura aguanta.** Si cambiar de
  transporte exigiera tocar la UI, el contrato estaría mal.
- **Los estados de fallo son alcanzables a propósito.** `/error` y `/slow`
  ejercitan el catálogo de errores y el watchdog de silencio sin provocar un fallo
  real.
- **El plan B del riesgo R1 ya está escrito.** `@mastra/client-js` arrastra
  `@mastra/core` y una dependencia transitiva con advisory que no se puede pisar
  sin romper `processDataStream` (ver `AGENTS.md`). Como el resto del repo solo
  conoce `AgentTransport`, sustituirlo por `readSseLines()` de
  `@shared/streams/sse.ts` es un archivo, no una refactorización.

## Coste aceptado

El mock miente en lo trivial: sus textos son fijos y su latencia es simulada. Se
asume a cambio de que el camino crítico (streaming, cancelación, errores,
rendimiento del transcript) sea verificable sin infraestructura.

## Verificación

`npm run verify:electron` hace el recorrido completo con el mock en Chromium:
hidrata la isla, escribe un prompt, espera a que el texto deje de crecer y exige
contenido real del dominio. `npm run verify:bundle` comprueba además que el cliente
del proveedor no está en el grafo inicial de la isla.
