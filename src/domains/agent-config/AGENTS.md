# AGENTS.md — `src/domains/agent-config`

Perillas por ejecución: modelo, temperatura, memoria. **Esqueleto**: el endpoint
`GET/PUT /api/agents/:agentId/config` ya valida y responde con defaults cuando el
upstream no expone el recurso; falta el formulario.

## Contratos que no se deben duplicar

- `agentConfigSchema` (BFF, en `agent-chat/server/normalize-agent-run.ts`) pone
  los valores por defecto del servidor.
- `DEFAULT_AGENT_SETTINGS` (cliente, `types/agent-config.types.ts`) es su espejo.

Si uno cambia y el otro no, la UI muestra un valor que el servidor no usó. El test
de contratos entre ambos es obligatorio al completar este slice.

## Límites declarados

`temperature` entre 0 y 2. Cualquier UI que permita otro valor está mintiendo: el
BFF lo rechaza con `invalid_request` y el campo correspondiente.
