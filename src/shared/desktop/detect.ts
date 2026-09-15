/**
 * @file src/shared/desktop/detect.ts
 * @description Detección del entorno de escritorio y acceso al puente.
 *
 * Se detecta por la **presencia del objeto que inyecta el preload**, nunca por el
 * user-agent: el UA se puede falsificar, cambia entre versiones de Electron y
 * además `astro check` no lo ve. En la web `window.desktop` es `undefined` y este
 * módulo devuelve `null`, que es lo que obliga al consumidor a decidir cómo se ve
 * sin escritorio.
 */
import type { DesktopBridge } from './types';

/** Solo en el navegador: en SSR no hay `window`. */
export function bridge(): DesktopBridge | null {
  if (typeof window === 'undefined') return null;
  return window.desktop ?? null;
}

export function isDesktop(): boolean {
  return bridge() !== null;
}

/**
 * `openExternal` con degradación: en escritorio usa el navegador del sistema;
 * en la web, `window.open` con `noopener` (el `rel` lo aplica el navegador al
 * usar `window.open`, por eso no se abre con `<a>` dinámico sin `rel`).
 */
export function openExternal(url: string): void {
  const desktop = bridge();
  if (desktop !== null) {
    desktop.openExternal(url);
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

/** Notificación de sistema con degradación a la Notification API web. */
export function notify(title: string, body: string): void {
  const desktop = bridge();
  if (desktop !== null) {
    desktop.notify(title, body);
    return;
  }
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    new Notification(title, { body });
  }
}
