# AGENTS.md — `src/domains/agent-sessions`

Hilos de conversación e identidad de memoria. **Esqueleto funcional**: endpoints
`GET/PATCH/DELETE /api/sessions[...]` y hook cacheado; falta la barra lateral.

## Regla de oro de este slice

La identidad (`resource`) **la fija el servidor** desde su cookie
(`agent-chat/server/session-scope.ts`). Ninguna ruta de este slice acepta un
`resource` vindo del cliente: sería un proxy abierto a la memoria de otra persona.

## Superficie

- `@domains/agent-sessions` → `useThreadList`, `THREADS_QUERY_KEY`, tipos.
- `@domains/agent-sessions/server` → `listThreads(resource)`.

## Al completar este slice

- Renombrar/borrar se hace desde una isla con `httpPatch`/`httpDelete`
  (`@shared/http/http-client`) y después se emite `session:renamed` /
  `session:deleted` por el bus, para que el sidebar y el contenido reaccionen sin
  recargar la página.
- La refetch del histórico se engancha a `agent:run-finished`, no a un intervalo.
