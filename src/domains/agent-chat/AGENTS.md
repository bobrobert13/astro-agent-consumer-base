# AGENTS.md — `src/domains/agent-chat`

El **motor** de la conversación: transporte, orquestación, contrato de mensajes y
BFF. Desde que el estudio (`chat-studio`) posee la presentación, aquí no hay ni un
`.vue`: la vista se fue con sus componentes.

## Superficie pública

| Importar | Qué da |
|---|---|
| `@domains/agent-chat` | `useAgentChat`, `checkTransport` y los tipos del dominio |
| `@domains/agent-chat/server` | Handlers del BFF: `relayStream`, `withGateway`, `chatUpstreamPath`, `resolveScope`, `resourceCookie` |

Nada más sale del slice. Los tests sí bajan a rutas internas
(`…/server/relay-body`, `…/ai/adapt-ui-messages`) cuando lo que prueban es un módulo
y no el barrel.

`useAgentChat` es un `createSharedComposable`: en Astro cada isla es su propia
`createApp()`, así que el estado se comparte por singleton de módulo y cualquier
componente del estudio que lo llame ve la misma conversación. Por eso el compositor,
el hilo y la raíz lo consumen **sin props** en medio.

## Mapa del directorio

```
ai/            el único sitio que conoce el vocabulario del AI SDK
  chat.transport.ts       elección de transporte y definición del wire format
  chat.transport.mock.ts  transporte simulado (ADR-003)
  chat.scope.ts           agente/hilo en el momento del envío + último mensaje del usuario
  mock-script.ts          guion del simulado, ya en chunks del SDK
  adapt-ui-messages.ts    UIMessage -> ChatMessage, funciones puras
composables/   orquestación y estado
  useAgentChat.ts     monta `useChat` y traduce; la superficie que consume la vista
  useStallWatchdog.ts vigilante de silencio (el SDK no distingue "pensando" de "muerto")
  useChatComposer.ts  texto en edición y reglas de envío
  services/chat/      chat.api.ts (Result<T>) · chat.endpoints.ts · chat.e.ts
server/        lógica del BFF
  relay-body.ts    única apertura del cuerpo de la petición (ver regla 5)
  stream-relay.ts  reenvío byte a byte de la respuesta
  session-scope.ts identidad de memoria + cookie
  normalize-agent-run.ts  schemas del BFF y destino del reenvío
types/         vocabulario del dominio (ChatMessage, ContentPart, StreamState)
```

## Reglas del slice

1. **El vocabulario del AI SDK solo se conoce en `ai/`** —y en `useAgentChat`, que
   monta el composable—. Ningún `.vue` lo importa: la vista consume `ChatMessage`.
   Lo comprueba `tests/architecture/boundaries.spec.ts`.
2. **Los servicios nunca lanzan**: devuelven `Promise<Result<T>>`. El `catch` que
   convierte a `ServiceError` es `normalizeServiceError`; `send()` cumple el contrato
   traduciendo `chat.error`, porque el SDK no rechaza.
3. **El texto en vuelo no es un mensaje de la lista.** `adapt-ui-messages.ts` saca el
   último globo del asistente de `messages` y lo expone como `streamingText`. Quien
   memoriza ese globo lo hace con la **longitud del texto** entre las dependencias;
   ese `v-memo` vive ahora en el estudio (`chat-studio/components/studio.memo.ts`),
   porque memorizar es una decisión de render, no del transporte.
4. **Todo error visible sale de `chat.e.ts`.** El texto que trae el SDK puede ser un
   interno del backend, así que se registra y **nunca** se pinta; a la pantalla va el
   catálogo. El transporte simulado emite el **código** como texto del error justo
   para poder ejercitar ese camino sin backend.
5. **El `resource` de memoria no lo decide el navegador.** El cliente manda solo el
   hilo (`ai/chat.transport.ts`) y `server/relay-body.ts` inyecta el resource de
   `session-scope.ts` en el cuerpo, saneando el hilo y resolviendo el destino de
   paso. La **respuesta** sigue saliendo byte a byte. Leer ADR-006 antes de tocar el
   relay.
6. **Mock y real son intercambiables.** Cualquier diferencia de comportamiento que
   obligue a un `if (transport === ...)` en la UI es un defecto del contrato.
7. **El estado de memoria se lee por `onData`, no de los `parts`.** Mastra lo manda
   en la parte `data-om-status` como estado del step, y una parte transitoria nunca
   llega a `messages`. Medirlo es aritmética del adapter (`memoryPressure`); decidir
   cuándo avisar es política de la vista (`StudioMemoryNotice`), que no pinta nada
   por debajo del umbral. El mock emite estado holgado salvo con `/memory`.
8. **Un bloqueo del backend se pinta.** El backend cierra la ejecución con la parte
   `data-tripwire` (scope guard, detector de inyección). Esa **sí** llega dentro de
   `message.parts`, así que el adapter la traduce a un aviso: sin eso la UI dejaría
   un globo VACÍO y el bloqueo parecería un fallo de la app. De su `reason` solo se
   muestra el del scope guard (es copy nuestra y es la parte accionable); el del
   detector lo redacta el modelo y se queda en el log del backend. El mock lo
   provoca con `/tripwire`.

## Cómo se prueba

```bash
npm run test                     # contratos, adapter, simulado, isla completa, BFF
npm run verify:bundle            # grafo inicial de la isla, sin servidor ni secretos
npm run verify:relay             # relay byte a byte + sonda de salud contra el stub
npm run transport:mock && npm run dev    # chat sin backend
# /error, /slow, /memory y /tripwire provocan los cuatro estados que no se ven solos
```

La isla ya no es de este slice: la monta `chat-studio`, y los tests de punta a punta
viven en `tests/dom/studio-chat.spec.ts`.

## Notas de entorno

`@mastra/client-js` ya no es dependencia del cliente: el navegador habla con el BFF
y el BFF con Mastra. La sonda de salud del camino BFF → backend es
`GET /api/health/upstream`, y su test vive en `tests/bff/health-upstream.spec.ts`.
