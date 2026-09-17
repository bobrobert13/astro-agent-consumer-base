# AGENTS.md — `src/pages/`

Árbol de rutas. Con `output: 'server'` **todo se sirve bajo demanda**; una página
que no dependa de datos por-request opta a estático con
`export const prerender = true` (ver `index.astro`, que se consolida en
`dist/client/index.html`).

## Dos tipos de archivo

| | `*.astro` | `api/**/*.ts` |
|---|---|---|
| Contiene | vista, layout, datos del servidor | 3 líneas de pegamento |
| Lógica | ninguna que se pueda mover | toda en `@domains/<slice>/server` |
| Importa | `@domains/x` (barrel de cliente) o `@domains/x/server` | solo el barrel `server` |

Un endpoint que acumule `if`s es un handler de slice mal ubicado.

## Cosas que no se hacen aquí

- **No crear `src/fetch.ts`**: Astro 7 lo reserva para advanced routing
  (`fetchFile`). El helper de fetch compartido es `@shared/http/http-client`.
- **No crear `src/middleware.ts`** para el gateway: su encadenamiento con una
  respuesta en `ReadableStream` añade un punto de fallo silencioso. Se usa
  `withGateway()` (helper explícito) en cada handler.
- **No importar `@shared/env/server` ni `@shared/server/*`** desde una página `.astro`
  que vaya a hidratar una isla: el test de fronteras lo rechaza.
- **No esconder el estado de navegación en un store**: la URL es el contrato entre
  slices. El agente activo viaja en `?agente=`, el hilo en el segmento de ruta.

## Rutas del boilerplate

```
/                      index prerenderizado (panel del esqueleto)
/chat/[threadId]       isla de chat, client:only + transition:persist
/agents                catálogo, renderizado en el servidor, cero JS
/agents/[agentId]      ficha del agente
/history               hilos de la identidad actual, cero JS
/settings              entorno público y atajos
/api/health            sonda (la usa el shell de Electron para saber que puede mostrar la ventana)
/api/health/upstream   sonda profunda BFF -> backend de agentes
/api/agents[/...]      JSON normalizado y recortado
/api/sessions[/...]    ídem, con el resource fijado por el servidor
/api/agent-chat        relay SSE verbatim hacia la ruta de chat del backend
```

## Verificación

`npm run all` y, si se tocó el relay o los endpoints, `npm run verify:relay`. La
prueba de que una página renderiza de verdad es `npm run verify:electron`, que abre
Chromium sobre `/chat/nuevo`.
