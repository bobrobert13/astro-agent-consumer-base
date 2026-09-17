# ADR-007 — El cliente del chat usa el AI SDK de Vercel; el BFF sigue reenviando

**Estado:** aceptado · **Fecha:** 2026-09-17
**Implementación:** `src/domains/agent-chat/ai/`, `src/pages/api/agent-chat.ts`,
`src/domains/agent-chat/server/stream-relay.ts`, `src/mastra/routes/chat.ts` (backend)
**Sustituye parcialmente a:** [ADR-001](./001-relay-sse-verbatim.md) · [ADR-003](./003-mock-first.md)

## Contexto

El chat funcionaba con cuatro piezas escritas a mano:

- `AgentTransport`, un contrato propio con dos implementaciones (`mock | mastra`);
- `@mastra/client-js` en el navegador, con `processDataStream` parseando el stream y
  `translateChunk` traduciendo su vocabulario al del dominio;
- tres composables orquestando transcript, ciclo de vida y batching **por fuera** del
  SDK: `useChatTranscript`, `useStreamLifecycle`, `useChatComposer`.

Nada de eso era incorrecto, pero todo era nuestro: el parser del protocolo, el
historial, el abort, la reconexión y el estado de la ejecución. Cada versión del
proveedor era un archivo a revisar, y el backend replicaba a mano el serializador SSE
de `createUIMessageStreamResponse` solo porque el paquete `ai` no estaba instalado.

## Decisión

Tres piezas, cada una en su capa:

1. **El backend habla el protocolo oficial.** `POST /chat/:agentId` se registra con
   `chatRoute()` de `@mastra/ai-sdk` y `version: 'v7'`. Desaparece el serializador
   local y con él la posibilidad de que el formato se desincronice del SDK.
2. **El BFF sigue copiando bytes.** `POST /api/agent-chat` reenvía **verbatim** la
   respuesta a `/chat/:agentId` (ruta custom de Mastra: cuelga de la raíz, no de
   `/api`). El agente viaja en el cuerpo, porque el transporte del cliente se
   construye una vez y el alcance se lee en cada envío.
3. **El cliente usa `useChat`.** `@ai-sdk/vue` (`ai@7`) `+ DefaultChatTransport`.
   `useAgentChat` monta el SDK por dentro y traduce su vocabulario al del dominio en
   `ai/adapt-ui-messages.ts`, con funciones puras. La UI y los componentes no cambian:
   siguen consumiendo `ChatMessage`.

## Consecuencias

**A favor**

- El protocolo del stream, el historial, el abort y la reconexión dejan de ser código
  nuestro. `useChat` los mantiene, y una actualización del SDK no es una refactorización.
- El backend pierde su única pieza frágil: ya no hay serializador SSE que replicar.
- Un solo sitio define el wire format que el cliente envía (`prepareSendMessagesRequest`)
  y un solo endpoint para todas las conversaciones.
- Cae la dependencia `@mastra/client-js` y, con ella, el advisory transitivo que
  obligaba a documentar una excepción en `AGENTS.md`.
- La traducción queda aislada y **probada como función pura** (`adapt-ui-messages.spec.ts`),
  igual que antes lo estaba `translateChunk`.

**En contra, aceptadas**

- **El chunk inicial de la isla crece.** Antes el cliente del proveedor se cargaba con
  `await import()` en el primer envío; ahora `useChat` **es** el núcleo de la isla y va
  en su grafo inicial. `verify:bundle` lo mide: 9 chunks, 469 KB en el cierre estático.
  Se paga al abrir el chat, que es exactamente cuando el usuario viene a chatear.
- **Se pierde el contrato propio de "agente desconocido".** El 404 con cuerpo propio era
  de la ruta escrita a mano; ahora es el de `chatRoute()`. El test de integración deja de
  fijar el cuerpo y exige lo que de verdad importa: que no se emita un stream.
- **`verify:bundle` cambia de aserto.** Ya no hay proveedor que diferir, así que vigila
  otra cosa —que el cierre estático no arrastre código de servidor ni secretos— e informa
  del tamaño. El aserto viejo no se puede conservar porque su premisa desapareció.

## Lo que **no** cambia

- **ADR-001 (relay verbatim) sigue vigente.** El BFF no parsea la respuesta: la copia
  byte a byte. Se verificó de nuevo en `verify:relay` (333 bytes vs 333).
- **ADR-006 (identidad de memoria) sigue vigente.** El cliente manda solo el hilo; el
  `resource` lo decide `server/session-scope.ts` y `relay-body.ts` lo inyecta con la
  única lectura posible del cuerpo. Si viniera del navegador, cualquiera leería el
  historial de otro.
- **ADR-003 (mock-first) sigue vigente.** `PUBLIC_AGENT_TRANSPORT=mock` mantiene la app
  arrancable sin backend: el transporte simulado implementa `ChatTransport` y emite el
  mismo vocabulario de chunks que el backend, con `/error` y `/slow` intactos.

## Deuda declarada

- `parseRunRequest`/`runRequestSchema` y `readSseLines` eran el **plan B** del cliente
  anterior (riesgo R1): hoy no tienen consumidor en producción. Se conservan porque
  siguen probados y describen un contrato propio válido, pero el disparador para
  borrarlos es explícito: el día que cambiar de proveedor de agentes no haga que
  alguien los eche de menos.
- `@ai-sdk/vue` fija su `ai` en la **misma versión exacta**, así que los dos se pinnean
  sin rango en `package.json`. Subirlos es mover los dos a la vez.

## Verificación

- `tests/agent-chat/adapt-ui-messages.spec.ts` — el puente, como funciones puras.
- `tests/dom/chat-island.spec.ts` — la isla de punta a punta contra el mock.
- `tests/bff/chat-routing.spec.ts` — el destino del relay sale del cuerpo: qué ids se
  aceptan y cuáles se rechazan.
- `tests/bff/health-upstream.spec.ts` — la sonda al backend.
- `npm run verify:bundle` y `npm run verify:relay`.
- `npm run verify:electron` sigue siendo la única prueba de lo que el usuario ve; no se
  ejecutó en esta rama por indicación expresa.
