/**
 * @file src/config/ui/tokens.ts
 * @description Constantes de UI que JS necesita de verdad.
 *
 * Prohibido duplicar aquí colores, radios o sombras: la fuente única es el
 * `@theme` de `src/styles/global.css`, y desde Tailwind se referencian con
 * `(--nombre)`. Este archivo solo tiene duraciones, teclas y claves de storage,
 * que son datos de comportamiento, no de apariencia.
 */

export const DURATIONS = {
  fast: 120,
  base: 200,
  slow: 320,
} as const;

/** Atajos globales del shell. `Ctrl+,` es preferencias en desktop y en web. */
export const SHORTCUTS = {
  preferences: 'mod+comma',
  newThread: 'mod+k',
  toggleSidebar: 'mod+shift+b',
  stopStream: 'escape',
} as const;

/** Claves de `localStorage`. Prefijo para no colisionar si se embebe la app. */
export const STORAGE_KEYS = {
  theme: 'aac.theme',
  sidebarOpen: 'aac.sidebar',
  lastThread: 'aac.lastThread',
} as const;
