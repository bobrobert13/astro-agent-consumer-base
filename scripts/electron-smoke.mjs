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
 *  - que el `contextBridge` del preload llega realmente al renderer;
 *  - que el CSP de producción no rompe la UI: el estudio abre capas de reka-ui
 *    (un desplegable y el modal de vista previa, que escriben `style=""`) y se
 *    exige que se vean y que no haya ningún aviso de Content Security Policy en
 *    el proceso.
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

// Chromium no avanza las transiciones CSS de una ventana oculta si la página
// todavía no ha pintado; esta sonda mide el resultado de una de ellas (el panel
// de contexto se abre moviendo su margen), así que se fuerzan todas las etapas
// del compositor antes de dibujar. Es el mismo remedio que documenta la guía de
// la plantilla para capturas de estados con transición.
app.commandLine.appendSwitch('run-all-compositor-stages-before-draw');

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

  const policy = await pagePolicy(`${baseUrl}/chat/nuevo`);
  // El CSP solo existe en la build de producción: si aquí está vacío, el resto de
  // comprobaciones de esta sección no vigilarían nada.
  record('el servidor emite Content-Security-Policy', policy !== '', policy.slice(0, 60));
  // El reparto concreto del contrato: `script-src` se mantiene estricto con
  // hashes y `style-src` se relaja —ver el comentario de `security.csp` en
  // astro.config.mjs. Que cada línea se afirme por separado es lo que hace que
  // alguien pueda cambiar una sin colapsar la otra.
  record(
    'script-src sigue en hashes, sin código inline',
    !/script-src[^;]*unsafe-inline/.test(policy) && /script-src[^;]*sha256-/.test(policy),
    directive(policy, 'script-src'),
  );
  record(
    "style-src es 'self' + 'unsafe-inline' (la UI escribe CSS en runtime)",
    /style-src 'self' 'unsafe-inline'/.test(directive(policy, 'style-src')),
    directive(policy, 'style-src'),
  );

  registerIpc();

  const win = new BrowserWindow({
    show: false,
    width: 1100,
    // Más alto que una ventana normal: las islas de `/settings` son
    // `client:visible` y solo hidratan lo que entra en el viewport.
    height: 1400,
    webPreferences: {
      preload: join(process.cwd(), 'electron/preload.cjs'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  const violations = watchViolations(win);

  await win.loadURL(`${baseUrl}/chat/nuevo`);

  const hydrated = await waitFor(() => win.webContents.executeJavaScript('!!document.querySelector("#aac-composer")'), 15_000);
  record('la isla Vue hidrata en Chromium', hydrated, 'se esperaba #aac-composer');

  if (hydrated) await driveChat(win);
  await exerciseStudio(win, baseUrl);

  record('bootstrap es el canal declarado en lib/ipc.mjs', CHANNELS.rendererToMain.bootstrap === 'desktop:bootstrap');
  record('la pantalla primaria es consultable desde el main', Number.isFinite(screen.getPrimaryDisplay().scaleFactor));

  record(
    'el capturador de violaciones está activo',
    violations.capturing(),
    'si CDP no adjunta, el aviso "cero violaciones" sería una lectura falsa',
  );
  record(
    'el CSP de producción no rompe nada en pantalla',
    violations.list.length === 0,
    violations.list.slice(0, 2).join(' / '),
  );
  violations.stop();

  win.destroy();
}

/**
 * Los avisos de CSP los escribe Chromium, no la página: `console-message` no los
 * alcanza. Se adjunta el depurador y se leen las entradas de `Log`, que es por
 * donde salen también los de las políticas. `capturing()` existe para que un CDP
 * no disponible falle como fallo del guardián, no como un "todo limpio".
 */
function watchViolations(win) {
  const list = [];
  const push = (text, entry) => {
    const value = String(text ?? '');
    if (/content security policy|refused to (apply|execute|load)|violates the following/i.test(value)) {
      const where = entry === undefined ? '' : ` [${entry.source ?? '?'} ${String(entry.url ?? '').replace(/^https?:\/\//, '').slice(0, 60)}:${entry.lineNumber ?? '?'}]`;
      list.push(`${value.slice(0, 300)}${where}`);
    }
  };

  // `(...args)` a propósito: Electron 44 pasa el evento como objeto y avisa de
  // que la firma posicional está deprecada, pero el argumento extra sigue llegando.
  const onConsole = (...args) => push(args[0]?.message ?? args[2]);
  win.webContents.on('console-message', onConsole);

  const onMessage = (_event, method, params) => {
    if (method === 'Log.entryAdded') push(params?.entry?.text ?? params?.entry?.message, params?.entry);
  };

  let attached = false;
  let logEnabled = false;
  try {
    win.webContents.debugger.attach('1.3');
    win.webContents.debugger.on('message', onMessage);
    attached = true;
    win.webContents.debugger
      .sendCommand('Log.enable')
      .then(() => {
        logEnabled = true;
      })
      .catch(() => {
        attached = false;
      });
  } catch {
    attached = false;
  }

  return {
    list,
    capturing: () => attached && logEnabled,
    stop() {
      win.webContents.removeListener('console-message', onConsole);
      if (attached) {
        try {
          win.webContents.debugger.detach();
        } catch {
          /* la ventana ya se destruyó */
        }
      }
    },
  };
}

/**
 * Centro en pantalla de un elemento, o `null`. Hace falta para mandar eventos de
 * ratón reales: `sendInputEvent` trabaja con coordenadas, no con nodos.
 */
async function centerOf(win, selector) {
  return win.webContents.executeJavaScript(
    `(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return null; const box = el.getBoundingClientRect(); return { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) }; })()`,
  );
}

async function clickAt(win, point) {
  // Chromium hace hit-testing con la última posición conocida del puntero: sin
  // este `mouseMove` previo, el `mouseDown` puede caer en el vacío.
  await win.webContents.sendInputEvent({ type: 'mouseMove', ...point });
  await sleep(60);
  await win.webContents.sendInputEvent({ type: 'mouseDown', ...point, button: 'left', clickCount: 1 });
  await win.webContents.sendInputEvent({ type: 'mouseUp', ...point, button: 'left', clickCount: 1 });
}

/**
 * El estudio es la pantalla que en dev no prueba el CSP: allí está apagado por
 * HMR, así que ni los atributos `style=""` que reka-ui escribe al posicionar un
 * desplegable ni los que el CSSOM pone en runtime se han evaluado contra una
 * política real. Abrir el panel de contexto y el desplegable de la cabecera
 * recorre los dos caminos.
 *
 * Las comprobaciones son funcionales, no discriminadores del CSP: lo que delata a
 * la política son los avisos de `watchViolations`, que es la razón de ser de esta
 * sección (ADR-004).
 */
/**
 * ¿Está abierto el panel de contexto? Se mira el **estado**, no la caja.
 *
 * Medir la geometría aquí sería medir el entorno: en una ventana oculta Chromium no
 * avanza la transición del margen con el que el panel entra, así que el estado
 * lógico cambia y el `left` se queda en el valor de partida. Lo que este guardián
 * tiene que probar es que el clic abre la capa y que la página sigue sin
 * violaciones de CSP; el tamaño de la columna es CSS.
 */
function isPanelOpen(win) {
  return win.webContents.executeJavaScript(`(() => {
    const toggle = document.querySelector('[aria-label="Panel de contexto"]');
    const panel = document.querySelector('aside[aria-label="Panel de contexto"]');
    if (!toggle || !panel) return false;
    return toggle.getAttribute('aria-expanded') === 'true' && panel.offsetWidth > 200;
  })()`);
}

async function exerciseStudio(win, baseUrl) {
  await win.loadURL(`${baseUrl}/`);

  const ready = await waitFor(
    () => win.webContents.executeJavaScript('!!document.querySelector("#aac-composer")'),
    15_000,
  );
  record('la raíz hidrata el estudio', ready);
  if (!ready) return;

  // El centro se recalcula en cada intento: si el panel llega a abrirse, la
  // cabecera se estrecha y el botón se mueve, así que insistir con las coordenadas
  // viejas cerraría lo que se acaba de abrir.
  let panelOpen = false;
  for (let attempt = 0; attempt < 3 && !panelOpen; attempt += 1) {
    const target = await centerOf(win, '[aria-label="Panel de contexto"]');
    if (target === null) break;
    await clickAt(win, target);
    panelOpen = await waitFor(() => isPanelOpen(win), 3_000);
  }
  record('el panel de contexto se abre', panelOpen);

  // Popper de reka-ui: no está en el wrapper, `data-state` vive en su contenido. Y
  // se comprueba el estado lógico y no la caja porque, en una ventana oculta,
  // Chromium no avanza las animaciones CSS: al cerrar, el nodo sigue montado con
  // `data-state="closed"` esperando un `animationend` que nunca llega.
  const popperState = `(() => {
    const el = document.querySelector('[data-reka-popper-content-wrapper]');
    if (!el) return { alive: false, state: '', inline: 0, ancho: 0, alto: 0, top: 0 };
    const box = el.getBoundingClientRect();
    return {
      alive: true,
      state: el.firstElementChild?.dataset.state ?? el.dataset.state ?? '',
      inline: el.style.length,
      ancho: Math.round(box.width),
      alto: Math.round(box.height),
      top: Math.round(box.top),
    };
  })()`;
  const readPopper = () => win.webContents.executeJavaScript(popperState);
  const isOpen = async () => (await readPopper()).state === 'open';

  // El primer desplegable del documento. Es un menú del registry, así que escribe
  // `style=""` al posicionarse: ese es el camino que el CSP tiene que dejar pasar.
  const trigger = await centerOf(win, '[aria-haspopup="menu"]');
  record('el selector de modelo del estudio es medible', trigger !== null, JSON.stringify(trigger));
  if (trigger === null) return;

  // Un `mouseDown` de verdad: reka-ui abre en `pointerdown`, y un `.click()`
  // sintético desde `executeJavaScript` no lo dispara.
  await clickAt(win, trigger);
  let appeared = await waitFor(isOpen, 6_000);
  if (!appeared) {
    // El primer clic puede llegar con el hit-test del ratón aún desactualizado.
    await clickAt(win, trigger);
    appeared = await waitFor(isOpen, 6_000);
  }
  const popper = await readPopper();
  record(
    'el popper del selector de modelo se posiciona (estilos en línea aplicados)',
    appeared && popper.inline > 0 && popper.ancho > 60 && popper.alto > 20,
    JSON.stringify(popper),
  );
}

async function pagePolicy(url) {
  try {
    const response = await fetch(url);
    return response.headers.get('content-security-policy') ?? '';
  } catch {
    return '';
  }
}

function directive(policy, name) {
  return (
    policy
      .split(';')
      .map((entry) => entry.trim())
      .find((entry) => entry.split(/\s+/)[0] === name) ?? `${name} ausente`
  );
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
