# AGENTS.md — `src/components/` y `src/layouts/`

Componentes de **toda la app**, sin JS. Si algo necesita reactividad de cliente,
no va aquí: va a la carpeta `components/` de su slice, o a
`src/components/ui/*.vue` si lo piden dos slices.

## Reglas

1. **`.astro` y cero directivas de hidratación.** Un componente de aquí nunca se
   hidrata; si te pillas escribiendo `client:` en uno, es un componente de slice
   mal ubicado.
2. **Props tipadas con `interface Props`, variantes con `variants()`**
   (`@shared/ui/variants`). Nada de clases sueltas concatenadas a mano: el mismo
   helper lo usan las islas `.vue`, y así un botón y su isla no divergen.
3. **Slots nombrados y cerrados**: `default`, `header`, `footer`, `actions`,
   `aside`, `fallback`, `leading`, `trailing`. Un slot nuevo se añade en el
   componente, no en el consumidor.
4. **Sin scoped slots.** Si un padre necesita pasar datos a un slot, eso es un
   componente `.vue` o se renderiza en el servidor con props.
5. **`class:list` para lo condicional**, `class` para lo fijo.

## Inventario

`AppShell` (rejilla del producto) · `SideNav` · `TopBar` · `Panel` ·
`PanelHeader` · `PageTitle` · `ButtonLink` · `Badge` · `Icon` · `EmptyState` ·
`Spinner` · `KeyHint` · `IslandFallback`.

`Icon` lee su lista cerrada de `icon.paths.ts`; `IslandFallback` es el
`slot="fallback"` estándar de toda isla con `client:only`.

## Layouts

`RootLayout` es el **único** `<html>`/`<head>`/`<body>`: no existe
`<Meta framework="vue">` en Astro 7, así que el `<head>` se escribe a mano, con
`viewport-fit=cover` para el notch en desktop. `AppLayout` añade el shell con
slots y monta una única isla, `ShellShortcuts` (`client:only`, sin UI): los
atajos globales que `/settings` anuncia; `BareLayout` es para onboarding y
errores.

Dos trampas de Astro 7 que afectan a esta carpeta:

- **`compressHTML: 'jsx'`** elimina el whitespace entre hermanos inline. Si dos
  `<span>`/`<em>` pegan y se comen un espacio, separar con `{" "}`.
- **El compilador Rust no corrige HTML inválido**: tags que cierran, y `<p>` no
  admite `<div>` dentro.
