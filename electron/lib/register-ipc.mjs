import { app, ipcMain, Notification, screen, shell } from 'electron';

import { CHANNELS, isSafeExternalUrl } from './ipc.mjs';
import { log } from './logger.mjs';

/**
 * @file electron/lib/register-ipc.mjs
 * @description Handlers del lado main, en un módulo aparte.
 *
 * Vive separado de `main.mjs` para que `scripts/electron-smoke.mjs` registre **los
 * mismos** handlers antes de abrir la ventana. Un smoke que prueba el puente con
 * handlers de juguete no prueba el puente.
 */
export function registerIpc() {
  ipcMain.on(CHANNELS.rendererToMain.openExternal, (_event, raw) => {
    // La validación va aquí, en el proceso con privilegios: el preload es código
    // que el renderer puede influir.
    if (!isSafeExternalUrl(raw)) {
      log('enlace externo rechazado', { raw: String(raw).slice(0, 120) });
      return;
    }
    void shell.openExternal(raw);
  });

  ipcMain.on(CHANNELS.rendererToMain.notify, (_event, payload) => {
    if (!Notification.isSupported()) return;
    new Notification({ title: String(payload?.title ?? ''), body: String(payload?.body ?? '') }).show();
  });

  // Un único viaje sincrónico en el arranque del preload: versión y pantalla son
  // datos de entorno que la UI lee una vez.
  ipcMain.on(CHANNELS.rendererToMain.bootstrap, (event) => {
    const display = screen.getPrimaryDisplay();
    event.returnValue = {
      appVersion: app.getVersion(),
      display: { scaleFactor: display.scaleFactor, isPrimary: true },
    };
  });
}
