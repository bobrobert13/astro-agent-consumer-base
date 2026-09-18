# AGENTS.md — `src/pages/`

Árbol de rutas. Solo hay dos, y las dos montan el mismo estudio.

| Ruta | Archivo | Render | Notas |
|---|---|---|---|
| `/` | `index.astro` | estático (`prerender = true`) | estado vacío; el `?agente=` lo aplica la isla al montar, porque una página estática no puede leerlo en el servidor |
| `/chat/[threadId]` | `chat/[threadId].astro` | SSR | el hilo viaja en la ruta y el agente en `?agente=`, resueltos en el servidor |

Las dos usan `@layouts/AppLayout.astro` y montan `ChatStudio` con
`transition:persist="chat-studio"`: navegar entre ellas **no reinicia el estudio**, y
por eso saltar de hilo no corta una respuesta en curso.

`index.astro` sigue prerenderizándose a propósito: es el sitio donde el boilerplate
demuestra el modo mixto de Astro 7 (`output: 'server'` con una página consolidada en
`dist/client`). La contrapartida —no poder leer la query en el servidor— está
resuelta en el cliente, no oculta.

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
- **No esconder el estado de navegación en un store**: la URL es el contrato. El
  agente activo viaja en `?agente=`, el hilo en el segmento de ruta.

## Endpoints

```
/api/health            sonda (la usa el shell de Electron para saber que puede mostrar la ventana)
/api/health/upstream   sonda profunda BFF -> backend de agentes
/api/agent-chat        relay SSE verbatim hacia la ruta de chat del backend
```

Los endpoints del catálogo de agentes, del historial y de los ajustes se fueron con
sus slices.

## Verificación

`npm run all` y, si se tocó el relay o los endpoints, `npm run verify:relay`. La
prueba de que una página renderiza de verdad es `npm run verify:electron`, que abre
Chromium sobre `/chat/nuevo` y sobre `/`.
