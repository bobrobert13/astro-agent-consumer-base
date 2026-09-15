/**
 * @file electron/main.mjs
 * @description Proceso principal del shell de escritorio.
 *
 * Dos modos, y la diferencia es solo de dónde viene la URL:
 *
 *  - **dev** (`scripts/electron-dev.mjs`): `ELECTRON_START_URL` apunta al
 *    `astro dev` que ya está levantado. El HMR funciona sin configuración
 *    adicional porque el renderer carga por `http://127.0.0.1:4321`, mismo origen
 *    que el WebSocket de Vite.
 *  - **prod**: se levanta el servidor Astro construido (`dist/server/entry.mjs`)
 *    en un puerto libre y se carga esa URL.
 *
 * Nunca `loadFile()`: con `file://` los módulos ESM fallan por CORS, `fetch`
 * same-origin deja de existir y el `Origin: null` de los POST choca contra
 * `security.checkOrigin` de Astro (403 en toda la app).
 */
import { app, BrowserWindow, dialog, Menu, shell } from 'electron';
import { fileURLToPath } from 'node:url';

import { assertBuilt, resolveAstroLayout } from './lib/paths.mjs';
import { startAstroServer } from './lib/astro-server.mjs';
import { enforceSingleInstance } from './lib/single-instance.mjs';
import { CHANNELS, MENU_ACTIONS, isSafeExternalUrl } from './lib/ipc.mjs';
import { registerIpc } from './lib/register-ipc.mjs';
import { log, logPath } from './lib/logger.mjs';

const preloadPath = fileURLToPath(new URL('./preload.cjs', import.meta.url));
const devUrl = process.env.ELECTRON_START_URL;

/** En macOS cerrar la ventana no es salir: sin esta bandera, `activate` no revive nada. */
let isQuitting = false;
/** @type {import('electron').BrowserWindow | null} */
let window = null;
/** @type {null | (() => void)} */
let stopServer = null;

app.on('before-quit', () => {
  isQuitting = true;
});

if (!enforceSingleInstance({ onSecondInstance: () => focusExisting() })) {
  // `requestSingleInstanceLock` ya pidió quit; nada que levantar.
} else {
  void bootstrap();
}

async function bootstrap() {
  await app.whenReady();

  // Windows necesita el AUMID para que las notificaciones no se las robe el
  // proceso de consola; en el resto de plataformas es un no-op.
  app.setAppUserModelId('dev.trebor.astroagentconsumer');
  registerIpc();
  Menu.setApplicationMenu(buildMenu());

  let url = devUrl;
  if (url === undefined) {
    try {
      const layout = assertBuilt(resolveAstroLayout({ dev: !app.isPackaged }));
      const server = await startAstroServer({ layout });
      if (server.url === null) {
        throw new Error(`El servidor no respondió a /api/health.\nSalida:\n${server.output.slice(-1500)}`);
      }
      stopServer = server.stop;
      url = server.url;
    } catch (error) {
      log('fallo al levantar el servidor', { message: String(error?.message ?? error) });
      dialog.showErrorBox(
        'No se pudo iniciar la aplicación',
        `El servidor local de la aplicación no arrancó.\n\nRuta del log:\n${logPath()}\n\n${String(error?.message ?? error)}`
      );
      app.exit(1);
      return;
    }
  } else {
    log('modo desarrollo: usando el servidor ya en marcha', { url });
  }

  createWindow(url);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow(url);
    else focusExisting();
  });
}

function createWindow(url) {
  window = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 900,
    minHeight: 560,
    show: false,
    title: 'Astro Agent Consumer',
    backgroundColor: '#0d1014',
    autoHideMenuBar: true,
    webPreferences: {
      preload: preloadPath,
      // Los tres en seco: el renderer es contenido web con puente limitado.
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
    },
  });

  window.once('ready-to-show', () => window?.show());

  window.webContents.on('did-fail-load', (_event, code, description, failedUrl) => {
    log('fallo de carga', { code, description, failedUrl });
  });

  // Cualquier destino externo se abre fuera de la app, y `file:` se rechaza.
  window.webContents.setWindowOpenHandler(({ url: target }) => {
    if (isSafeExternalUrl(target)) void shell.openExternal(target);
    return { action: 'deny' };
  });

  window.loadURL(url).catch((error) => log('loadURL rechazado', { message: String(error?.message ?? error) }));

  window.on('resize', () => {
    window?.webContents.send(CHANNELS.mainToRenderer.windowResized, {
      width: window?.getBounds().width,
      height: window?.getBounds().height,
    });
  });

  window.on('closed', () => {
    window = null;
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' || isQuitting) app.quit();
});

app.on('quit', () => {
  // Primero el hijo: el adapter de Node ya cierra los SSE abiertos al recibir
  // SIGTERM, así que no hay streams colgando cuando el proceso se va.
  stopServer?.();
  log('app terminada');
});

function focusExisting() {
  if (window === null) return;
  if (window.isMinimized()) window.restore();
  window.focus();
}

function buildMenu() {
  const send = (action) => window?.webContents.send(CHANNELS.mainToRenderer.menuAction, { action });

  const template = [
    {
      label: app.name,
      submenu: [
        { label: 'Preferencias', accelerator: 'CmdOrCtrl+,', click: () => send(MENU_ACTIONS.preferences) },
        { label: 'Hilo nuevo', accelerator: 'CmdOrCtrl+K', click: () => send(MENU_ACTIONS.newThread) },
        { role: 'togglefullscreen' },
        { type: 'separator' },
        { role: process.platform === 'darwin' ? 'close' : 'quit' },
      ],
    },
    { role: 'editMenu' },
    { role: 'viewMenu' },
    {
      label: 'Ventana',
      submenu: [
        { label: 'Mostrar/ocultar navegación', accelerator: 'CmdOrCtrl+Shift+B', click: () => send(MENU_ACTIONS.toggleSidebar) },
        { role: 'reload' },
        { role: 'toggleDevTools' },
      ],
    },
  ];

  return Menu.buildFromTemplate(template);
}
