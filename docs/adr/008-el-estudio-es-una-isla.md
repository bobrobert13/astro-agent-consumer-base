# ADR-008 — El estudio de chat es una sola isla

## Contexto

La pantalla principal dejó de ser chrome `.astro` con islas pequeñas y pasó a ser el
estudio completo: rail de navegación, cabecera, estado vacío con composer, hilo,
panel de contexto y capas (menús, modal, toasts). Toda esa superficie comparte
estado: colapsar el rail mueve la cabecera, abrir el panel estrecha el panel central,
cerrar el modal no debe dejar la vista previa huérfana.

Al mismo tiempo, el hilo del agente tiene que **sobrevivir a la navegación** entre `/`
y `/chat/<hilo>`: es lo que permite saltar de conversación sin cortar una respuesta en
curso.

La política del repositorio pide lo contrario en general: chrome `.astro` sin
directiva (cero JS) y una isla solo donde haga falta (`AGENTS.md`, «Política de
hidratación»).

## Decisión

`ChatStudio` es **una única isla** montada con `client:only="vue"` +
`transition:persist` desde `AppLayout`, y dentro vive todo lo interactivo.

El motivo es una restricción dura, no una preferencia: el motor del chat
(`useAgentChat` → AI SDK) **solo existe en el navegador**, así que una isla que
contenga el hilo no puede renderizarse en servidor. Y una vez que el hilo y su
composer viven en una isla, el chrome que los rodea no se puede repartir en islas
hermanas sin manipular desde fuera un DOM ajeno.

## Alternativas rechazadas

1. **Chrome `.astro` + varias islas pequeñas** (el patrón anterior). Obliga a que el
   rail, la cabecera y el panel de contexto se gobiernen desde islas que no son dueñas
   de ese DOM: clases que hay que tocar a mano, `provide`/`inject` que no cruza islas
   y estado duplicado entre el store y el composable. El patrón era correcto para una
   pantalla sin estado compartido; deja de serlo cuando el layout entero responde al
   mismo estado.
2. **`client:load`** para tener HTML en el servidor. Imposible: el núcleo de la isla
   es el AI SDK, que no existe en Node. Es la misma razón por la que la isla de chat
   ya era `client:only` (ADR-007).
3. **Composer fuera de la isla**, para que el campo sea HTML estático. No resuelve
   nada: el composer necesita `canSubmit`, el foco y el borrador, que son estado del
   mismo composable.

## Coste aceptado

- **No hay HTML útil antes de hidratar.** Lo cubre el `slot="fallback"` del layout
  (`IslandFallback`, que pinta el `Skeleton` del registry): el usuario ve un
  esqueleto, no un salto de layout.
- **El cierre de los `.astro` de chrome desaparece en esta pantalla.** El repositorio
  pierde ahí su regla de «cero JS en el chrome», y por eso queda escrito: es una
  excepción localizada, no un cambio de política. Las pantallas nuevas que no
  compartan este estado deben seguir usando `.astro`.
- **Los errores de render son invisibles en producción.** El `sink` de `reportError`
  solo escribe en DEV, así que una isla que revienta al montar se queda **vacía y sin
  un solo mensaje en consola**. Costó un rato encontrarlo (un `inject` de un `provide`
  propio, ver `chat-studio/AGENTS.md`). Quien toque el arranque del estudio, que mire
  la isla en Chromium antes de dar por bueno un cambio.

## Prueba que la sostiene

- `npm run verify:electron` abre el servidor construido en Chromium y comprueba que
  la isla **hidrata**, que un prompt dispara el stream y que la respuesta se asienta
  en pantalla, sin una sola violación de CSP.
- `tests/dom/studio-chat.spec.ts` cruza el motor, la política de re-render y el DOM
  del transcript contra el transporte simulado.
- `npm run verify:bundle` localiza el chunk de la isla por el literal
  `Conversación con el agente` (el `aria-label` del panel) y recorre su grafo estático
  para asegurarse de que no arrastra código de servidor ni secretos.
