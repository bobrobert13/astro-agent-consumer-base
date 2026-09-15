/**
 * @file electron/lib/ipc.mjs
 * @description Nombres de canal y payloads compartidos entre main y preload.
 *
 * Fuente de verdad del lado Node. El contrato del lado TypeScript es
 * `src/shared/desktop/types.ts`; que los dos coincidan lo comprueba
 * `npm run verify:electron`.
 *
 * Solo dos cosas viajan del main al renderer (menú y redimensionado) y cuatro del
 * renderer al main (abrir enlace, notificar, versión, pantalla). Nada más: cada
 * canal extra es superficie de ataque en un proceso con privilegios.
 */
export const CHANNELS = {
  rendererToMain: {
    openExternal: 'desktop:open-external',
    notify: 'desktop:notify',
    bootstrap: 'desktop:bootstrap',
  },
  mainToRenderer: {
    menuAction: 'menu:action',
    windowResized: 'window:resized',
  },
};

/** Acciones del menú nativo que se traducen a navegación interna. */
export const MENU_ACTIONS = {
  preferences: 'preferences',
  newThread: 'new-thread',
  toggleSidebar: 'toggle-sidebar',
  about: 'about',
};

/** Un `file:` disfrazado de http es el intento clásico. */
export function isSafeExternalUrl(raw) {
  if (typeof raw !== 'string') return false;
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}
