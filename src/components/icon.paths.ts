/**
 * @file src/components/icon.paths.ts
 * @description Glifos del sprite y su tipo.
 *
 * Módulo aparte a propósito: con `verbatimModuleSyntax` activo, exportar el tipo
 * desde `Icon.astro` enreda la compilación para quien lo importe desde otro
 * `.astro` o un `.vue`. Aquí vive la lista cerrada; añadir un icono = una clave.
 */
export const ICON_PATHS = {
  chat: '<path d="M2 4.5A2.5 2.5 0 0 1 4.5 2h7A2.5 2.5 0 0 1 14 4.5v4A2.5 2.5 0 0 1 11.5 11H6l-3 3v-3H4.5A2.5 2.5 0 0 1 2 8.5z"/>',
  agents: '<circle cx="8" cy="5" r="3"/><path d="M2 14a6 6 0 0 1 12 0"/>',
  history: '<circle cx="8" cy="8" r="6"/><path d="M8 4.5V8l2.5 1.5"/>',
  settings:
    '<circle cx="8" cy="8" r="2.5"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.5 1.5M11.5 11.5 13 13M13 3l-1.5 1.5M4.5 11.5 3 13"/>',
  spark: '<path d="M8 1.5 9.4 6l4.6 2-4.6 2L8 15.5 6.6 10 2 8z"/>',
  send: '<path d="M2 8h11M9 4l4 4-4 4"/>',
  stop: '<rect x="4" y="4" width="8" height="8" rx="1.5" fill="currentColor" stroke="none"/>',
  copy: '<rect x="5" y="5" width="9" height="9" rx="2"/><path d="M11 5V3a2 2 0 0 0-2-2H3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/>',
  error: '<circle cx="8" cy="8" r="6.5"/><path d="M8 5v4M8 11h.01"/>',
  user: '<circle cx="8" cy="6" r="2.5"/><path d="M3 14a5 5 0 0 1 10 0"/>',
} as const;

export type IconName = keyof typeof ICON_PATHS;
