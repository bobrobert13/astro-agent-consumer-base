# Lenguaje visual

Una sola fuente: el bloque `@theme` de `src/styles/global.css`. Tailwind v4 genera
las utilidades desde ahí (`bg-surface`, `text-ink-muted`, `rounded-panel`,
`shadow-float`) y **no existe `tailwind.config.js`**.

## Tokens

| Token | Utilidad | Uso |
|---|---|---|
| `--color-canvas` | `bg-canvas` | fondo de la aplicación |
| `--color-surface` | `bg-surface` | tarjetas, burbujas, barras |
| `--color-elevated` | `bg-elevated` | hover, código, estado vacío |
| `--color-line` | `border-line` | separadores y bordes |
| `--color-ink` / `--color-ink-muted` | `text-ink`, `text-ink-muted` | texto primario y secundario |
| `--color-brand-500/600/050` | `bg-brand-500`, `text-brand-600` | acción primaria y su tinte |
| `--color-danger`, `--color-warning` | `text-danger`, `bg-danger/10` | error y aviso |
| `--radius-panel` / `--radius-bubble` | `rounded-panel`, `rounded-bubble` | contenedor y globo de chat |
| `--shadow-panel` / `--shadow-float` | `shadow-panel`, `shadow-float` | elevación estática y de popover |
| `--text-bubble` | `text-bubble` | cuerpo del mensaje |

Los seis tokens de concepto (`--aac-canvas`, `--aac-surface`, `--aac-line`,
`--aac-ink`, `--aac-ink-muted`, `--aac-elevated`) se **reasignan** en `.dark` y en
`prefers-color-scheme: dark`. Por eso el `@theme` es `inline`: las utilidades
quedan apuntando a la variable de concepto y el tema se cambia sin duplicar la
paleta.

## Reglas

1. **Ningún color, radio o sombra se duplica en TypeScript.**
   `src/config/ui/tokens.ts` solo guarda duraciones, teclas y claves de `localStorage`
   — datos de comportamiento, no de apariencia.
2. **Las variantes se declaran con `variants()`** (`@shared/ui/variants`), no con
   clases sueltas. Un componente `.astro` y un `.vue` consumen el mismo helper, así
   que un botón y su isla no pueden divergir.
3. **Los tamaños son escalas, no píxeles sueltos.** Si algo necesita un `text-[13px]`,
   falta un token.
4. **El markdown del agente se pinta con `prose`** (plugin `@tailwindcss/typography`)
   dentro de `MarkdownBlock.vue`, y sin `v-html`: el contenido del agente es entrada
   no confiable.
5. **Movimiento**: `prefers-reduced-motion` ya anula las duraciones en la capa base.
   Nada de animaciones que no puedan desactivarse así.

## Componentes de app (`src/components/`)

Primitivas `.astro`, cero JS, con slots nombrados: `AppShell`, `SideNav`, `TopBar`,
`Panel`, `PanelHeader`, `PageTitle`, `ButtonLink`, `Badge`, `Icon`, `EmptyState`,
`Spinner`, `KeyHint`, `IslandFallback`.

Un `.vue` de un slice que pidan dos slices se **promociona** a
`src/components/ui/*.vue`; la decisión se toma ahí, con el segundo consumidor en
frente, no por adelantado.

## Iconografía

`src/components/icon.paths.ts` es la lista cerrada de glifos: un `<svg>` inline por
`use`, same-origin, `currentColor` para heredar de `text-*`. Añadir un icono es
añadir una clave; el tipo `IconName` hace el resto.
