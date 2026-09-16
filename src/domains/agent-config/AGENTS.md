# AGENTS.md — `src/domains/agent-config`

Perillas por ejecución: modelo, temperatura, memoria. El formulario
(`AgentConfigCard`) y los dos endpoints (`GET/PUT /api/agents/:agentId/config`)
existen y las tres capas comparten el mismo contrato.

## Superficie

| Importar | Qué da |
|---|---|
| `@domains/agent-config` | `AgentConfigCard`, `DEFAULT_AGENT_SETTINGS`, `CONFIG_ERROR_CODES`, tipos |
| `@domains/agent-config/server` | `agentConfigSchema`, `readAgentConfig` |

`readAgentConfig` lo usan **dos** caminos que necesitan lo mismo: la ruta del BFF y
`settings.astro` durante el render. La lógica vive en `server/read-config.ts`; la
ruta es un envoltorio. Duplicarla era la forma segura de que las dos se separaran.

## Contratos que no se deben duplicar

- `agentConfigSchema` (servidor, `server/config.schema.ts`) pone los valores por
  defecto del servidor. **Vive aquí**, no en `agent-chat/server`: el dueño del dato
  es este slice, y tenerlo lejos obligaba a mirar hacia otra slice para validar lo
  propio.
- `DEFAULT_AGENT_SETTINGS` (cliente, `types/agent-config.types.ts`) es su espejo.
  El test de contratos entre ambos es `tests/agent-config/config.spec.ts`.

Si uno cambia y el otro no, la UI muestra un valor que el servidor no usó.

## El formulario no pide nada al nacer

`settings.astro` resuelve la config en el servidor y la pasa como
`initialSettings`: el composable arranca con `settings === saved`, `dirty` falso y
`canSave` verdadero, así que el HTML sale con los controles **habilitados**.

Hacerlo al revés —hidratar, pedir, esperar— se nota: en ese hueco el formulario
está deshabilitado y parece roto. Si algún día se añade otra pantalla con este
formulario, que pase la config por props igual que esta; y si la lectura del
servidor puede tardar, con presupuesto (`AbortSignal.timeout`), porque el
`readAgentConfig` del BFF **nunca falla por el upstream**: devuelve defaults, y por
eso la página siempre tiene algo usable que enviar.

`vue-sonner` entra por `import()` al primer aviso, no en el arranque: son ~20 KB
que no hacen falta para editar el formulario (medido: el chunk de la isla pasó de
48 KB a 24 KB).

## Límites declarados

`temperature` entre 0 y 2. Cualquier UI que permita otro valor está mintiendo: el
BFF lo rechaza con `invalid_config` y señala el campo.
