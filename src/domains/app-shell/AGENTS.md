# AGENTS.md — `src/domains/app-shell`

Estado global del chrome —el rail y el tema— y la barra de progreso de navegación.
El slice quedó reducido a eso: los atajos, la tarjeta de apariencia y el chrome
`.astro` de la navegación se fueron con las pantallas heredadas.

## Superficie

- `@domains/app-shell` → `NavigationProgress` (barra), `useAppShellStore` y
  `ShellTheme`.

Los atajos del producto los registra el estudio (`chat-studio`): es una isla única
presente en todas las rutas, así que tenerlos en una segunda isla hermana solo servía
para que las dos reaccionaran a la misma tecla. El conmutador de tema vive en el menú
de la tarjeta de usuario del rail, que es quien escribe `setTheme`.

## Barra de navegación

`NavigationProgress.vue` se monta **una sola vez** en `AppLayout`, con
`client:only="vue"` + `transition:persist`: tiene que ser **la misma instancia** en
todas las rutas, porque su estado es el ciclo de vida del `ClientRouter`
(`astro:before-preparation` arranca, `astro:page-load` cierra). Remontarla en cada
navegación la dejaría llegando tarde a su propio evento.

Tres decisiones que no son de estilo:

- **Avance a ciegas con techo (88 %), nunca 100 % por su cuenta**: el 100 % significa
  "la página está lista", y solo lo sabe el evento de fin.
- **Red de seguridad de 8 s**: si la navegación se cancela, `page-load` no llega
  nunca y la barra se quedaría avanzando sola.
- **`aria-hidden`**: aparece en cada navegación, y un `role="progressbar"` anunciado
  cada vez es ruido para un lector de pantalla. El cambio de página ya se anuncia por
  sí solo.

Se dibuja con el `Progress` del registry, así que el color sale de los tokens y el
indicador es el mismo que en cualquier otro progreso.

## Estado

`src/stores/app-shell.ts` es el **único** store Pinia del repo, y sigue teniendo los
tres disparadores de `AGENTS.md`: lo lee y escribe más de una isla (`NavigationProgress`
y el estudio), sobrevive a la navegación —donde `transition:persist` no aplica porque
la isla de la barra es otra— y conviene verlo en devtools. Guarda `sidebarOpen`,
`theme` y `busy`, y persiste los dos primeros en `localStorage`.

El estudio lo lee para el rail y el tema, pero **no** lo usa para su propio estado:
el resto del chrome vive en `useStudioShell` (`provide`/`inject`), porque no cruza
ninguna frontera de isla.

## Desktop frente a web

La detección es por presencia del puente (`@shared/desktop/detect`), nunca por el
user-agent. Cada capacidad tiene degradación explícita:

| Capacidad | Desktop | Web |
|---|---|---|
| Abrir enlace externo | `bridge().openExternal` | `window.open` con `noopener` |
| Notificar | `bridge().notify` | Notification API |
| Preferencias | atajo nativo | menú del usuario en el rail |

Si `electron/` cambia sus canales, se actualiza aquí y en
`src/shared/desktop/types.ts` a la vez.
