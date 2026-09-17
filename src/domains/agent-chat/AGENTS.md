# AGENTS.md — `src/domains/agent-chat`

Contexto acotado de la conversación: transcript, composer, streaming de tokens,
cancelación y errores. Es la slice de referencia; las otras cuatro siguen esta misma
forma. Desde ADR-007 el motor del chat es el AI SDK (`useChat`), no un transporte propio.

## Superficie pública

| Importar | Qué da |
|---|---|
| `@domains/agent-chat` | `ChatIsland` (componente raíz), `useAgentChat`, `checkTransport`, tipos del dominio |
| `@domains/agent-chat/server` | Handlers del BFF: `relayStream`, `withGateway`, `chatUpstreamPath`, `resolveScope`, `resourceCookie` |

Nada más sale del slice. `src/pages/chat/[threadId].astro` importa el barrel de cliente;
`src/pages/api/**`, el de servidor. Los tests sí bajan a rutas internas
(`…/server/relay-body`, `…/ai/adapt-ui-messages`) cuando lo que prueban es un módulo, y
no el barrel.

## Mapa del directorio

```
ai/            el único sitio que conoce el vocabulario del AI SDK
  chat.transport.ts       elección de transporte y definición del wire format
  chat.transport.mock.ts  transporte simulado (ADR-003)
  chat.scope.ts           agente/hilo en el momento del envío + último mensaje del usuario
  mock-script.ts          guion del simulado, ya en chunks del SDK
  adapt-ui-messages.ts    UIMessage -> ChatMessage, funciones puras
composables/   orquestación y estado de la UI
  useAgentChat.ts     monta `useChat` y traduce; la superficie que consume la isla
  useStallWatchdog.ts vigilante de silencio (el SDK no distingue "pensando" de "muerto")
  useChatComposer.ts  texto en edición y reglas de envío
  services/chat/      chat.api.ts (Result<T>) · chat.endpoints.ts · chat.e.ts
components/    .vue interactivos, solo de este slice
  chat.memo.ts      dependencias de `v-memo` del globo (ver regla 3)
  MemoryNotice.vue  aviso cuando la memoria del hilo se llena (ver regla 7)
server/        lógica del BFF
  relay-body.ts    única apertura del cuerpo de la petición (ver regla 5)
  stream-relay.ts  reenvío byte a byte de la respuesta
  session-scope.ts identidad de memoria + cookie
  normalize-agent-run.ts  schemas del BFF y destino del reenvío
types/         vocabulario del dominio (ChatMessage, ContentPart, StreamState)
```

## Reglas del slice

1. **El vocabulario del AI SDK solo se conoce en `ai/`** —y en `useAgentChat`, que monta
   el composable—. Ningún `.vue` importa `ai` ni `@ai-sdk/vue`: la vista consume
   `ChatMessage`. Lo comprueba `tests/architecture/boundaries.spec.ts`.
2. **Los servicios nunca lanzan**: devuelven `Promise<Result<T>>`. El `catch` que
   convierte a `ServiceError` es `normalizeServiceError`; `send()` cumple el contrato
   traduciendo `chat.error`, porque el SDK no rechaza.
3. **El texto en vuelo no es un mensaje de la lista.** `adapt-ui-messages.ts` saca el
   último globo del asistente de `messages` y lo expone como `streamingText`. La
   consecuencia se paga cara si se olvida: el globo en vuelo se memoriza con
   `chat.memo.ts` y sus dependencias **incluyen la longitud del texto**; sin eso se queda
   congelado en el primer chunk (`tests/dom/chat-message.spec.ts` es la regresión).
4. **Todo error visible sale de `chat.e.ts`.** El texto que trae el SDK puede ser un
   interno del backend, así que se registra y **nunca** se pinta; a la pantalla va el
   catálogo. El transporte simulado emite el **código** como texto del error justo para
   poder ejercitar ese camino sin backend.
5. **El `resource` de memoria no lo decide el navegador.** El cliente manda solo el hilo
   (`ai/chat.transport.ts`) y `server/relay-body.ts` inyecta el resource de
   `session-scope.ts` en el cuerpo, saneando el hilo y resolviendo el destino de paso. La
   **respuesta** sigue saliendo byte a byte. Leer ADR-006 antes de tocar el relay.
6. **Mock y real son intercambiables.** Cualquier diferencia de comportamiento que
   obligue a un `if (transport === ...)` en la UI es un defecto del contrato.
7. **El estado de memoria se lee por `onData`, no de los `parts`.** Mastra lo manda en
   la parte `data-om-status` como estado del step, y una parte transitoria nunca llega a
   `messages`. Medirlo es aritmética del adapter (`memoryPressure`); decidir cuándo
   avisar es política de la vista (`MemoryNotice`), que no pinta nada por debajo del
   umbral. El mock emite estado holgado salvo con `/memory`.

## Cómo se prueba

```bash
npm run test                     # contratos, adapter, simulado, isla completa, BFF
npm run verify:bundle            # grafo inicial de la isla, sin servidor ni secretos
npm run verify:relay             # relay byte a byte + sonda de salud contra el stub
npm run transport:mock && npm run dev    # chat sin backend
# /error, /slow y /memory en el composer provocan los tres estados que no se ven solos
```

## Notas de entorno

Ya no hay advisory abierto: `@mastra/client-js` salió del cliente con ADR-007 y con él
se fue `@ai-sdk/provider-utils@2.2.8`. La sonda de salud del camino BFF → backend es
`GET /api/health/upstream`, y su test vive en `tests/bff/health-upstream.spec.ts`.
