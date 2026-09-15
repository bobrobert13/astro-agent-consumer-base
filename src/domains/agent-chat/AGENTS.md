# AGENTS.md — `src/domains/agent-chat`

Contexto acotado de la conversación: transcript, composer, streaming de tokens,
cancelación y errores. Es la slice de referencia; las otras cuatro siguen esta
misma forma.

## Superficie pública

| Importar | Qué da |
|---|---|
| `@domains/agent-chat` | `ChatIsland` (componente raíz), `useAgentChat`, tipos del dominio |
| `@domains/agent-chat/server` | Handlers del BFF: `relayStream`, `withGateway`, `parseRunRequest`, `resolveScope` |

Nada más sale del slice. `src/pages/chat/[threadId].astro` importa el barrel de
cliente; `src/pages/api/**`, el de servidor.

## Mapa del directorio

```
transport/     contrato AgentTransport + implementaciones (mock | mastra)
composables/   orquestación y estado de la UI
  services/chat/   chat.api.ts (Result<T>) · chat.endpoints.ts · chat.e.ts · data/
components/    .vue interactivos, solo de este slice
server/        lógica del BFF: relay, validación, identidad
types/         vocabulario del dominio (ChatMessage, ContentPart, StreamState)
```

## Reglas del slice

1. **`useAgentChat` solo habla con `AgentTransport`.** Si alguien importa
   `@mastra/client-js` fuera de `transport/mastra.ts`, el test
   `tests/architecture/boundaries.spec.ts` lo rechaza.
2. **Los servicios nunca lanzan**: devuelven `Promise<Result<T>>`. El `catch` que
   convierte a `ServiceError` es `normalizeServiceError`.
3. **Todo error visible sale de `chat.e.ts`.** Un `code` nuevo sin entrada en el
   catálogo hace fallar `tests/agent-chat/errors.spec.ts` a propósito.
4. **El texto en vuelo no es un mensaje de la lista.** Ver `useChatTranscript`:
   `shallowRef` + `token-batcher`, y promoción a mensaje al cerrar.
5. **Mock y real son intercambiables.** Cualquier diferencia de comportamiento que
   obligue a un `if (transport === ...)` en la UI es un defecto del contrato.
6. **El `resource` de memoria no lo decide el navegador**
   (`server/session-scope.ts`).

## Cómo se prueba

```bash
npm run test                     # contratos, transporte mock, transcript, BFF
npm run verify:bundle            # el cliente del proveedor, solo en chunk diferido
npm run verify:relay             # relay byte a byte contra el stub SSE
npm run transport:mock && npm run dev    # chat sin backend
# /error y /slow en el composer provocan los dos estados de fallo
```

## Notas de entorno

`npm audit` reporta una vulnerabilidad low e inevitable dentro de
`@mastra/client-js` (`@ai-sdk/provider-utils@2.2.8`, fijado en exacto por
`@ai-sdk/ui-utils@1.2.11`). No se pisa con `overrides`: el salto de major cambia el
parser que usa `processDataStream`. Este archivo es el punto de escape —
`@shared/streams/sse.ts` (`readSseLines`) implementa el mismo contrato sin él.
