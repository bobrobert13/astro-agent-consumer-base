# ADR-006 — La identidad de memoria la fija el BFF; el cuerpo de la petición sí se abre

**Estado:** aceptada · 2026-09-16
**Implementación:** `src/domains/agent-chat/server/relay-body.ts`,
`server/session-scope.ts`, `ai/chat.transport.ts`

> **Actualizado por [ADR-007](./007-ai-sdk-ui-transport.md).** La regla no cambia —el
> `resource` lo decide el servidor y la respuesta sale byte a byte—, pero el cliente que
> manda el hilo es `ai/chat.transport.ts`, no `transport/mastra.ts`. El cuerpo ahora trae
> además el `agentId`, que también se resuelve aquí.

## Contexto

El backend de agentes agrupa el historial por `(resource, thread)`. `resource` es,
de hecho, la identidad del usuario. El repo lo documentaba como invariante —"el
`resource` de memoria no lo decide el navegador"— pero el código hacía lo
contrario, de tres formas a la vez:

1. `transport/mastra.ts` mandaba `memory: { resource: 'browser' }` **hardcodeado**
   desde el navegador. Todos los usuarios del mundo compartían `resource`.
2. El relay reenviaba el cuerpo del cliente **verbatim**, así que no tenía forma
   de corregirlo.
3. `resolveScope()` de `session-scope.ts` leía una cookie que **nadie emitía**
   (`resourceCookie` era código muerto), con lo que siempre devolvía la constante
   `'anonymous'`. La regla se cumplía en la forma, no en el efecto.

A la vez, la documentación afirmaba que "nada que no pase este schema llega al
upstream" sobre `parseRunRequest`, que **ningún camino de producción llamaba**: el
cuerpo que llega al relay lo construye `@mastra/client-js`, no nuestro cliente.

## Decisión

- **El cliente manda solo el hilo.** `transport/mastra.ts` pasa
  `memory: { thread }`; `resource` no sale del navegador.
- **El BFF inyecta la identidad.** `server/relay-body.ts` abre el cuerpo JSON
  acotado, y si encuentra un objeto `memory`, fija `memory.resource` con el valor
  de `resolveScope()` y pasa `memory.thread` por `sanitizeThread()`. Cualquier
  otra clave del cuerpo del proveedor se devuelve intacta.
- **La respuesta sigue saliendo byte a byte.** La política del ADR-001 no se toca:
  "verbatim" es sobre el stream de salida. Reescribir **un campo** del JSON de
  entrada es la excepción ya prevista por aquella decisión ("el JSON siempre se
  normaliza en el servidor").
- **Se acuña la identidad y se fija en el navegador.** `resolveScope()` genera un
  id (32 hex) cuando falta la cookie y devuelve su `Set-Cookie`; lo emiten los dos
  caminos que resuelven scope (el relay y `/api/sessions`), para que listar hilos
  y conversar no usen recursos distintos.
- **El cuerpo se acota** con `readBodyText` (256 KB), muy por debajo del
  `bodySizeLimit` de 2 MB del adapter, para poder dar un 413 explicable.

## Consecuencias

- Poner un id de otro en el JSON deja de funcionar: el servidor lo sobrescribe.
  Cuando exista login, el único archivo que cambia es `session-scope.ts`.
- Cada navegador tiene su propia memoria. Antes de esto, dos navegadores en la
  misma máquina compartían historial.
- El relay lee el cuerpo de las peticiones JSON, así que hay un `await` antes del
  `fetch` al upstream. Eso abre una ventana real de cancelación previa, que se
  cubre con un cortocircuito: si el cliente ya abortó, se responde 499 **sin**
  abrir conexión.
- Un cuerpo opaco (no JSON) se sigue reenviando en streaming con `duplex: 'half'`;
  uno JSON acotado viaja como texto, así que ya no necesita `duplex`.
- `parseRunRequest` sigue existiendo y documentado como lo que es: el validador
  del contrato propio del BFF (la ruta que construye `chat.endpoints` y el plan B
  del riesgo R1), no del wire format del SDK. No se aplica en el relay porque
  rechazaría el 100 % de las peticiones reales.

## Alternativas rechazadas

- **Un `resource` por defecto en el backend** y no mandar nada: deja el aislamiento
  de memoria en manos de la configuración del proveedor, y el boilerplate deja de
  poder prometer nada sobre sus propios datos.
- **Meter la identidad en una cabecera** (`x-resource`): el backend la lee del
  cuerpo; sería inventar un contrato que el proveedor no entiende.
- **Un middleware de Astro que reescriba el cuerpo**: es exactamente lo que el
  repo evita (el `withGateway` explícito, ADR del BFF) por su interacción con las
  respuestas en streaming.
- **Validar el cuerpo del SDK con `runRequestSchema`**: rechazaría todas las
  peticiones reales; el schema describe nuestro contrato, no el del proveedor.
- **Seguir con `'anonymous'`** y dejar `resourceCookie` muerto: mantiene la
  apariencia de la regla sin su efecto, que es el estado del que venimos.
