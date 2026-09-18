/**
 * @file src/config/ui/tokens.ts
 * @description Constantes de UI que JS necesita de verdad.
 *
 * Prohibido duplicar aquí colores, radios o sombras: la fuente única es el
 * `@theme` de `src/styles/theme.css`, y desde Tailwind se referencian por token.
 * Este archivo solo tiene datos de comportamiento, no de apariencia.
 *
 * Aquí vivían también las duraciones y la tabla de atajos. Se fueron con las
 * pantallas que las consumían: los atajos del estudio se declaran junto a su
 * manejador (`useStudioShortcuts`), que es donde los busca quien los lee.
 */

/** Claves de `localStorage`. Prefijo para no colisionar si se embebe la app. */
export const STORAGE_KEYS = {
  theme: 'aac.theme',
  sidebarOpen: 'aac.sidebar',
  lastThread: 'aac.lastThread',
} as const;
