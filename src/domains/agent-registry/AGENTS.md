# AGENTS.md — `src/domains/agent-registry`

Catálogo de agentes disponibles y selección activa. **Esqueleto funcional**: el
BFF y el hook cacheado existen; la UI propia (tarjetas con filtros, búsqueda) es
del proyecto que nazca aquí.

## Superficie

- `@domains/agent-registry` → `useAgentCatalog` (colada), `AGENTS_QUERY_KEY`, tipos.
- `@domains/agent-registry/server` → `listAgents()`, `getAgent(id)`.

## Lo que ya está decidido

- **`GET /api/agents` responde un mapa keyed por id** en Mastra 1.29
  (`{"research-agent": {...}}`), no un array. `list-agents.ts` acepta array, mapa
  y `{ agents: ... }` para no romperse en el siguiente cambio de versión.
- **Recorte en el servidor**: `instructions`, costos e ids internos no viajan.
  Añadir un campo al DTO es una decisión de exposición, no un detalle de serialización.
- La página `src/pages/agents/index.astro` **no usa isla**: llama al handler del
  slice desde el servidor. Es la vía por defecto para una vista sin interactividad.

## Al completar este slice

1. La lista se pinta con `useAgentCatalog()` dentro de una isla (`client:idle` o
   `client:visible`), no en un `.astro` que vuelva a pedir el catálogo por HTTP.
2. Invalidar tras un desplegado: `useQueryCache().invalidate({ key: AGENTS_QUERY_KEY })`,
   expuesto como acción, no escondido en un `mounted`.
3. El agente activo viaja en la URL (`?agente=`), nunca en un store.
