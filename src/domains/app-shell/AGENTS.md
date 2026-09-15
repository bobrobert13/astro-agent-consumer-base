# AGENTS.md — `src/domains/app-shell`

Navegación, atajos, tema y puente con el escritorio. **Esqueleto funcional**: la
isla `ShellShortcuts`, `useShortcuts` y el store global existen; el menú nativo
de desktop y el centro de notificaciones están por escribir.

## Superficie

- `@domains/app-shell` → `ShellShortcuts` (isla sin UI), `useShortcuts`, `useAppShellStore`.

## Atajos

`ShellShortcuts.vue` se monta **una sola vez** en `AppLayout` con
`client:only="vue"`: toca `document` y el store de Pinia, así que nunca debe
renderizarse en el servidor. Sin esa isla, los atajos que `/settings` anuncia no
existen. El atajo de detener el stream (Escape) **no** es global: vive en
`ChatIsland.vue` y solo actúa con una ejecución viva.

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
