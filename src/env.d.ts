/// <reference types="astro/client" />
/**
 * Tipos globales del proyecto.
 *
 * `astro sync` escribe `.astro/types.d.ts` (coleccioness y `env.schema`); este
 * archivo es el sitio donde aumentamos `Window` con lo que inyecta el shell de
 * escritorio.
 */
import type { DesktopBridge } from './shared/desktop/types';

declare global {
  interface Window {
    /** `undefined` en la web; lo define `electron/preload.cjs` vía contextBridge. */
    desktop?: DesktopBridge;
  }
}

export {};
