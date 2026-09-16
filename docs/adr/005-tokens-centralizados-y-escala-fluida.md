# ADR-005 — Tokens centralizados y escala fluida, con la tipografía de elementos en la capa base

**Estado:** aceptada · 2026-09-16
**Implementación:** `src/styles/theme.css`, `src/styles/global.css`,
`tests/architecture/design-tokens.spec.ts`

## Contexto

El sistema visual vivía entero en `global.css`, mezclado con el documento base y
la rejilla del shell, y cubría color, radios y sombras pero **no tipografía**:
`--text-bubble` era el único tamaño declarado y no lo usaba nadie. El resultado,
medido en el repo antes de esta decisión:

- tres copias de un tamaño arbitrario (`text-[0.6875rem]`) en tres archivos;
- tres `text-white` donde existía `--aac-on-brand` sin usar;
- la misma escala copiada a mano en treinta call sites (`text-sm font-semibold`
  para cada `h2`, `text-xs text-ink-muted` para cada pie).
- `p`, `h1`… desnudos sin estilo: el preflight los deja en `font-size: inherit`,
  así que un párrafo huérfano se ve distinto según quién lo escribió.

Un color no se duplica, pero un tamaño de letra sí se estaba duplicando: la regla
"una sola fuente" no tenía dientes en la parte que más se repite.

## Decisión

1. **`src/styles/theme.css` es la única fuente.** Tokens, escala y tipografía de
   elementos. `global.css` queda como entrada (imports, plugins, variante `dark`),
   documento base y rejilla del shell.
2. **La escala tipográfica es fluida con `clamp()`**, y cada token lleva su
   `--line-height`, su `--font-weight` y su `--letter-spacing`. Un titular es
   `text-title`, no cuatro utilidades.
3. **El ritmo (gutter, flow, block, section) también es fluido**, y convive con la
   escala numérica de Tailwind: fluido para la respiración de la página, numérico
   para lo local (`gap-1`).
4. **`@layer base` estiliza `h1`…`h6`, `p`, `small`, `caption`, `code`** con esos
   tokens, vía `@apply`.
5. **Un test lo sostiene.** `tests/architecture/design-tokens.spec.ts` falla si
   reaparece un `text-[…]`, un `text-white`, un `#hex` en un componente, o un
   `--text-*` sin interlineado.

## Consecuencias

- Rediseñar el rango tipográfico es editar `theme.css`: cero ediciones en
  componentes. Un cambio de 15 → 17 px en el texto corrido mueve a la vez el
  globo del chat y cualquier `p`.
- Los elementos desnudos se ven bien sin utilidades, así que el camino de menor
  resistencia deja de ser copiar clases.
- El CSS generado es algo mayor (una regla base por elemento), y las pantallas
  heredadas cambian de tamaño ligeramente al heredar de `p`. Es el precio de que
  la escala sea la misma en todas partes; esas pantallas están en la lista de
  borrado.
- El guardián de tokens exime hoy `src/pages/**` (pantallas heredadas) y
  `src/components/ui/**` (registry). El día que las pantallas se borren, la
  exclusión se quita y el guardián cubre todo el repo.

## Alternativas rechazadas

- **Dejar la escala como utilidades sueltas** (`text-sm font-semibold` en cada
  sitio): es lo que había, y el inventario de arriba es la prueba de a dónde lleva.
- **Un token por breakpoint** (`--text-title-sm`, `--text-title-md`…): multiplica
  los tokens por cada rango y obliga a encadenar `sm:`/`md:` en cada call site.
  `clamp()` resuelve el mismo problema con una declaración.
- **`tailwind.config.js` con `theme.extend`**: Tailwind v4 es CSS-first y el
  proyecto no tiene config JS; añadirlo partiría la fuente en dos.
- **Sobreescribir las clases de los componentes del registry**: se pierden en el
  siguiente `add`/`diff` y crean una segunda fuente de verdad por componente.
