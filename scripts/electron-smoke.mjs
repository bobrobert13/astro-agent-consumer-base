/**
 * @file scripts/electron-smoke.mjs
 * @description Arranca la app **en Chromium de verdad** y ejercita el chat.
 *
 * Se ejecuta como proceso principal de Electron (`electron scripts/electron-smoke.mjs`),
 * reutilizando los mismos módulos de `electron/lib` que usa `main.mjs`: si el smoke
 * pasa, lo probado es el camino de producción, no una paráfrasis.
 *
 * Cubre lo que ningún test de Vitest puede cubrir:
 *  - que la isla Vue hidrata y que el Pinia/colada instalado por `appEntrypoint`
 *    no revienta al montar;
 *  - que el ciclo prompt → relay → stream → transcript ocurre en pantalla;
 *  - que el servidor Astro construido arranca desde Electron y responde a su
 *    propio `/api/health`;
 *  - que el `contextBridge` del preload llega realmente al renderer.
 *
 * Deja una captura en `smoke/electron-chat.png`. Sale con 0 si todo pasó.
 *
 * Nota de entorno: en una máquina sin el sandbox SUID de Chromium configurado,
 * `--no-sandbox` va ANTES de la ruta del script; después de ella, Electron lo toma
 * como argumento de la app y el sandbox sigue activo.
 */
import { app, BrowserWindow, screen } from 'electron';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

import { startAstroServer } from '../electron/lib/astro-server.mjs';
import { registerIpc } from '../electron/lib/register-ipc.mjs';
import { CHANNELS } from '../electron/lib/ipc.mjs';

const OUT_DIR = 'smoke';
const results = [];

// Electron no reanuda un `await` en el nivel superior de un módulo ESM del main:
// el cuerpo va dentro de una función invocada de forma síncrona durante la
// evaluación del módulo (verificado: con TLA cuelga antes de `whenReady`).
run().catch((error) => {
  console.error('[smoke] error inesperado:', error);
  app.exit(1);
});

function record(label, ok, detail = '') {
  results.push({ label, ok });
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${label}${detail === '' ? '' : ` — ${detail}`}`);
}

async function run() {
  // El smoke no debe pelearse con una ventana abierta por el usuario.
  if (!app.requestSingleInstanceLock(`smoke-${process.pid}`)) {
    app.exit(0);
    return;
  }

  await app.whenReady();

  const layout = {
    mode: 'smoke',
    root: process.cwd(),
    entry: join(process.cwd(), 'dist/server/entry.mjs'),
    client: join(process.cwd(), 'dist/client'),
  };

  const server = await startAstroServer({ layout, timeoutMs: 25_000 });
  record('el servidor Astro construido arranca desde Electron', server.url !== null, server.url ?? server.output.slice(-200));

  if (server.url !== null) await exerciseApp(server.url);

  server.stop();
  const failed = results.filter((result) => !result.ok);
  console.log(failed.length === 0 ? '\nverify:electron OK' : `\nverify:electron: ${failed.length} fallo(s)`);
  app.exit(failed.length === 0 ? 0 : 1);
}

async function exerciseApp(baseUrl) {
  const health = await fetch(`${baseUrl}/api/health`).then((response) => response.json()).catch(() => null);
  record('/api/health responde ok:true', health?.ok === true, JSON.stringify(health));
  record('el transporte declarado es legible', health?.transport === 'mock' || health?.transport === 'mastra', String(health?.transport));
  record('health no filtra el host del upstream', health !== null && !JSON.stringify(health).includes('4111'));

  registerIpc();

  const win = new BrowserWindow({
    show: false,
    width: 1100,
    height: 720,
    webPreferences: {
      preload: join(process.cwd(), 'electron/preload.cjs'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  await win.loadURL(`${baseUrl}/chat/nuevo`);

  const hydrated = await waitFor(() => win.webContents.executeJavaScript('!!document.querySelector("#aac-composer")'), 15_000);
  record('la isla Vue hidrata en Chromium', hydrated, 'se esperaba #aac-composer');

  if (hydrated) await driveChat(win);

  record('bootstrap es el canal declarado en lib/ipc.mjs', CHANNELS.rendererToMain.bootstrap === 'desktop:bootstrap');
  record('la pantalla primaria es consultable desde el main', Number.isFinite(screen.getPrimaryDisplay().scaleFactor));

  win.destroy();
}

const transcriptText = 'Array.from(document.querySelectorAll("article .rounded-bubble")).map((node) => node.textContent.trim()).join(" | ")';
const transcriptLength = 'Array.from(document.querySelectorAll("article .rounded-bubble")).map((node) => node.textContent.trim()).join("").length';

async function driveChat(win) {
  const bridge = JSON.parse(
    await win.webContents.executeJavaScript(
      'JSON.stringify({ tipo: typeof window.desktop, isDesktop: window.desktop?.isDesktop ?? null, version: window.desktop?.appVersion ?? null, platform: window.desktop?.platform ?? null, escala: window.desktop?.display?.scaleFactor ?? null })'
    )
  );
  record('el preload expone el puente de escritorio', bridge.tipo === 'object' && bridge.isDesktop === true, JSON.stringify(bridge));
  record('bootstrap devuelve la versión real de la app', /^\d+\.\d+/.test(String(bridge.version)), String(bridge.version));
  record(
    'la plataforma y la escala llegan al renderer',
    typeof bridge.platform === 'string' && Number.isFinite(bridge.escala),
    `${bridge.platform} @${bridge.escala}`
  );

  await win.webContents.executeJavaScript('document.querySelector("#aac-composer").focus()');
  await win.webContents.insertText('explícame el boilerplate en una línea');
  await win.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Return' });
  await win.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Return' });

  const settled = await waitForStable(win);
  record('el prompt dispara el stream y la respuesta se asienta', settled);

  const text = await win.webContents.executeJavaScript(transcriptText);
  record('la respuesta tiene contenido real', text.length > 80, `${text.length} caracteres`);
  record('el stream no terminó en un error interno', !/\[object|undefined|Processor workflow/.test(text), text.slice(0, 80));
  record('el texto es del dominio simulado', /boilerplate|transporte|BFF|contrato|slicing|simul/i.test(text));

  mkdirSync(OUT_DIR, { recursive: true });
  const image = await win.webContents.capturePage();
  const file = join(OUT_DIR, 'electron-chat.png');
  writeFileSync(file, image.toPNG());
  record('captura guardada', image.getSize().width > 100, file);
}

/**
 * Espera a que el texto del transcript DEJE DE CRECER. Medir pronto daría un
 * stream truncado y una falsa lectura de "respuesta vacía".
 */
async function waitForStable(win, timeoutMs = 30_000) {
  let previous = -1;
  let stable = 0;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const length = await win.webContents.executeJavaScript(transcriptLength).catch(() => 0);
    stable = length > 80 && length === previous ? stable + 1 : 0;
    previous = length;
    if (stable >= 3) return true;
    await sleep(400);
  }
  return false;
}

async function waitFor(check, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      if (await check()) return true;
    } catch {
      /* la página todavía no tiene el DOM esperado */
    }
    await sleep(250);
  }
  return false;
}
