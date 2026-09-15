const { contextBridge, ipcRenderer } = require('electron');

/**
 * @file electron/preload.cjs
 * @description Puente entre el renderer (la app Astro) y el main.
 *
 * CJS porque un preload sandboxeado no admite `import`/`export` de ESM (Electron,
 * "ESM in Electron"). Y **sin `require` de archivos propios**: en un preload
 * sandboxeado `require` está limitado a un puñado de módulos de Electron y Node,
 * y una ruta relativa falla en silencio — el resultado es un `window.desktop`
 * `undefined` sin ningún mensaje claro en la consola. Por eso los canales están
 * escritos aquí literalmente.
 *
 * La fuente de verdad sigue siendo `lib/ipc.mjs`; la deriva entre los dos archivos
 * la corta `tests/architecture/ipc-channels.spec.ts`, que se ejecuta sin Electron.
 *
 * Superficie mínima: lectura + dos acciones. No se expone `ipcRenderer` crudo ni
 * un `invoke` genérico: eso convertiría cualquier XSS de una isla en ejecución de
 * IPC arbitrario.
 */
const CHANNELS = {
  openExternal: 'desktop:open-external',
  notify: 'desktop:notify',
  bootstrap: 'desktop:bootstrap',
};

const ALLOWED_EVENTS = ['menu:action', 'window:resized'];

function bootstrap() {
  try {
    return ipcRenderer.sendSync(CHANNELS.bootstrap) ?? {};
  } catch {
    // Sin handler no hay puente útil, pero la app web sigue funcionando.
    return {};
  }
}

// Resuelto una sola vez, en el arranque: `contextBridge` no soporta getters ni
// descriptores de propiedad, y con ellos el `exposeInMainWorld` completo falla.
const info = bootstrap();

contextBridge.exposeInMainWorld('desktop', {
  isDesktop: true,
  platform: process.platform,
  appVersion: String(info.appVersion ?? '0.0.0'),
  display: info.display ?? { scaleFactor: 1, isPrimary: true },

  openExternal(url) {
    ipcRenderer.send(CHANNELS.openExternal, String(url));
  },

  notify(title, body) {
    ipcRenderer.send(CHANNELS.notify, { title: String(title), body: String(body) });
  },

  /**
   * Suscripción con allowlist. Devuelve la función de cierre, que es lo que
   * necesita `onScopeDispose()` de un composable.
   */
  on(channel, callback) {
    if (!ALLOWED_EVENTS.includes(channel)) {
      throw new Error(`Canal de escritorio no permitido: ${channel}`);
    }
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },
});
