# Lenguaje visual

Una sola fuente: el bloque `@theme` de **`src/styles/theme.css`**. Tailwind v4
genera las utilidades desde ahí (`bg-surface`, `text-title`, `gap-gutter`,
`rounded-panel`) y **no existe `tailwind.config.js`**. `global.css` importa ese
archivo y se queda con lo que no es token: plugins, la variante de tema, el
documento base y la rejilla del shell.

## Escala tipográfica

Un token de texto lleva dentro su tamaño, su interlineado, su peso y su tracking,
así que un titular es **una** clase y no cuatro utilidades repetidas. El tamaño es
fluido con `clamp()`: el mínimo es el de móvil y el máximo el de escritorio, sin
`sm:`/`md:` encadenados.

| Token | Utilidad | Para qué |
|---|---|---|
| `--text-display` | `text-display` | portada o métrica grande (28 → 44 px) |
| `--text-title` | `text-title` | `h1` de página, titular de sección (20 → 28 px) |
| `--text-title-sm` | `text-title-sm` | `h2` de panel, título de barra (15 → 18 px) |
| `--text-lede` | `text-lede` | entradilla bajo un titular |
| `--text-body` | `text-body` | texto corrido y globo del chat (15 → 17 px) |
| `--text-body-sm` | `text-body-sm` | texto denso: listas, celdas, markdown |
| `--text-label` | `text-label` | etiquetas de control, botones, metadatos fuertes |
| `--text-caption` | `text-caption` | pies, marcas de tiempo, ayudas |
| `--text-code` | `text-code` | `code`, `kbd`, `pre` |

El interlineado de cada token se declara aparte (`--text-body--line-height`) y
**no es opcional**: `tests/architecture/design-tokens.spec.ts` falla si un tamaño
nuevo se olvida del suyo.

## Ritmo y medidas

El patrón es: **token fluido para lo que marca la respiración de la página**, y la
escala numérica de siempre (`gap-1`, `p-2`) para lo local y apretado. Sobre-tokenizar
no es DRY, es ofuscar: `gap-1` entre un icono y su texto es más legible que
`gap-flow`.

| Token | Utilidad | Para qué |
|---|---|---|
| `--spacing-gutter` | `px-gutter`, `gap-gutter` | padding lateral de página y de barras (12 → 24 px) |
| `--spacing-flow` | `gap-flow` | separación entre bloques de una misma lista |
| `--spacing-block` | `py-block`, `mb-block` | aire dentro de una sección |
| `--spacing-section` | `py-section` | aire entre secciones (32 → 64 px) |
| `--container-measure` | `max-w-measure` | ancho de un globo del chat (85ch) |
| `--container-prose` | `max-w-prose` | ancho de un texto de lectura (72ch) |
| `--container-column` | `max-w-column` | columna central de una vista (48rem) |
| `--container-rail` | `max-w-rail`, `w-rail` | rail de navegación y de ajustes (16rem) |

`--container-rail` es también el ancho de la rejilla del shell: `global.css` lo
lee con `theme()` para no repetir el literal.

## Color

Dos vocabularios, una sola paleta:

- **Tokens de concepto (`--aac-*`)**: la fuente. `bg-canvas`, `bg-surface`,
  `bg-elevated`, `border-line`, `text-ink`, `text-ink-muted`, `text-on-brand`,
  `bg-brand-500/600/050`, `text-danger`, `text-warning`. **Es el vocabulario del
  código escrito a mano.**
- **Mapa semántico de shadcn-vue**: `--background`, `--primary`, `--muted`… no
  traen colores nuevos, apuntan a las `--aac-*`. Existe para que los componentes
  de `src/components/ui/**` funcionen sin una paleta paralela. **Se usa solo
  dentro del registry**; en código propio se escribe `text-ink-muted`, no
  `text-muted-foreground`.

Los seis neutrales (`--aac-canvas`, `--aac-surface`, `--aac-elevated`,
`--aac-line`, `--aac-ink`, `--aac-ink-muted`) se **reasignan** en `.dark` y en
`prefers-color-scheme: dark`. Por eso el `@theme` es `inline`: las utilidades
apuntan a la variable de concepto y el tema se cambia sin duplicar la paleta.
Marca, peligro y aviso no cambian entre temas.

Ningún valor de color se escribe fuera de `theme.css`: ni un `#hex`, ni un
`rgb()`, ni un `text-white` (para eso está `text-on-brand`). Lo comprueba el
guardián de tokens.

## Tipografía de elementos

`theme.css` estiliza los elementos desnudos en `@layer base` para que nadie tenga
que recordar utilidades en cada sitio:

| Elemento | Se pinta como |
|---|---|
| `h1` | `text-title text-ink` |
| `h2` | `text-title-sm text-ink` |
| `h3` … `h6` | `text-label text-ink` |
| `p` | `text-body` |
| `small`, `figcaption`, `caption` | `text-caption text-ink-muted` |
| `code`, `kbd`, `samp`, `pre` | `font-mono text-code` |

No le quita el mando a nadie: la capa base tiene la especificidad más baja, así
que cualquier utilidad en el elemento gana, y `prose` (especificidad de clase)
sigue mandando dentro de `MarkdownBlock`.

## Reglas

1. **Ningún color, radio o sombra se duplica en TypeScript.**
   `src/config/ui/tokens.ts` solo guarda duraciones, teclas y claves de
   `localStorage` — datos de comportamiento, no de apariencia.
2. **Los tamaños son escalas, no píxeles sueltos.** Si algo necesita un
   `text-[13px]`, falta un token. El guardián de tokens lo rechaza.
3. **La apariencia de los componentes del registry se cambia por tokens**, no
   sobreescribiendo sus clases. Si un `Skeleton` no te gusta, se mueve
   `--color-primary`, no el componente (que además se regenera con cada `add`).
4. **Las variantes de los componentes propios se declaran con `variants()`**
   (`@shared/ui/variants`), no con clases sueltas: el mismo helper lo usan
   `.astro` y `.vue`, así que un botón y su isla no pueden divergir.
5. **El markdown del agente se pinta con `prose`** dentro de `MarkdownBlock.vue`, y
   sin `v-html`: el contenido del agente es entrada no confiable.
6. **Movimiento**: `prefers-reduced-motion` anula las duraciones en la capa base.
   Nada de animaciones que no puedan desactivarse así.

## Componentes de app (`src/components/`)

Primitivas `.astro`, cero JS, con slots de la lista cerrada (`default`, `header`,
`footer`, `actions`, `aside`, `fallback`, `leading`, `trailing`, `empty`, `head`):
`AppShell`, `SideNav`, `TopBar`, `Panel`, `PanelHeader`, `PageTitle`,
`ButtonLink`, `Badge`, `Icon`, `EmptyState`, `Spinner`, `KeyHint`,
`IslandFallback`.

Un `.vue` de un slice que pidan dos slices se **promociona** a
`src/components/ui/*.vue` (o a `.astro` en esta carpeta si no necesita
reactividad); la decisión se toma ahí, con el segundo consumidor en frente, no por
adelantado.

`Badge.astro` está **deprecado** en favor de `@components/ui/badge`: sobrevive
solo para el chrome sin isla de las pantallas heredadas, y no admite consumidores
nuevos.

## Iconografía

`src/components/icon.paths.ts` es la lista cerrada de glifos para `.astro`: un
`<svg>` inline por `use`, same-origin, `currentColor` para heredar de `text-*`.
Añadir un icono es añadir una clave; el tipo `IconName` hace el resto. Dentro de
una isla `.vue` se usan los iconos de `@lucide/vue`, que es lo que usa el
registry.
