# AGENTS.md — `src/domains/app-shell`

Navegación, atajos, tema, progreso de navegación y puente con el escritorio.
**Esqueleto funcional**: la isla `ShellShortcuts`, `useShortcuts`, la barra
`NavigationProgress` y el store global existen; el menú nativo de desktop y el
centro de notificaciones están por escribir.

## Superficie

- `@domains/app-shell` → `ShellShortcuts` (isla sin UI), `NavigationProgress` (barra),
  `useShortcuts`, `useAppShellStore`.

## Atajos

`ShellShortcuts.vue` se monta **una sola vez** en `AppLayout` con
`client:only="vue"`: toca `document` y el store de Pinia, así que nunca debe
renderizarse en el servidor. Sin esa isla, los atajos que `/settings` anuncia no
existen. El atajo de detener el stream (Escape) **no** es global: vive en
`ChatIsland.vue` y solo actúa con una ejecución viva.

## Barra de navegación

`NavigationProgress.vue` también se monta una sola vez en `AppLayout`, con
`client:only="vue"` + `transition:persist`: tiene que ser **la misma instancia** en
todas las rutas, porque su estado es el ciclo de vida del `ClientRouter`
(`astro:before-preparation` arranca, `astro:page-load` cierra). Remontarla en cada
navegación la dejaría llegando tarde a su propio evento.

Tres decisiones que no son de estilo:

- **Avance a ciegas con techo (88 %), nunca 100 % por su cuenta**: el 100 % significa
  "la página está lista", y solo lo sabe el evento de fin.
- **Red de seguridad de 8 s**: si la navegación se cancela, `page-load` no llega
  nunca y la barra se quedaría avanzando sola.
- **`aria-hidden`**: aparece en cada navegación, y un `role="progressbar"`
  anunciado cada vez es ruido para un lector de pantalla. El cambio de página ya se
  anuncia por sí solo.

Se dibuja con el `Progress` del registry (`src/components/ui/progress`), así que el
color sale de los tokens y el indicador es el mismo que en cualquier otro progreso.

## Estado

`src/stores/app-shell.ts` es el **único** store Pinia del repo y el ejemplo del
disparador correcto: varias islas, sobrevive a la navegación y conviene verlo en
devtools. Todo lo demás se comparte por URL, por el bus o por composable.

## Desktop frente a web

La detección es por presencia del puente (`@shared/desktop/detect`), nunca por el
user-agent. Cada capacidad tiene degradación explícita:

| Capacidad | Desktop | Web |
|---|---|---|
| Abrir enlace externo | `bridge().openExternal` | `window.open` con `noopener` |
| Notificar | `bridge().notify` | Notification API |
| Preferencias | atajo nativo o `/settings` | `/settings` |

Si `electron/` cambia sus canales, se actualiza aquí y en
`src/shared/desktop/types.ts` a la vez.
