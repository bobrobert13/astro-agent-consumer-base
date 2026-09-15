import { spawn } from 'node:child_process';
import { log } from './logger.mjs';
import { freePort } from './free-port.mjs';

/**
 * @file electron/lib/astro-server.mjs
 * @description Levanta el servidor Astro construido como proceso hijo y lo apaga.
 *
 * Cuatro decisiones que no son de estilo:
 *
 * 1. **`process.execPath` + `ELECTRON_RUN_AS_NODE=1`**, no un `node` del sistema:
 *    el paquete no puede asumir que exista Node en la máquina del usuario (y en
 *    macOS la App Store prohíbe ejecutar otro runtime). El fuse `runAsNode` viene
 *    activado por defecto en Electron; si alguien lo apaga, esto falla ruidosamente.
 * 2. **Entorno con allowlist explícita**: `ELECTRON_RUN_AS_NODE` heredado junto a
 *    un `NODE_OPTIONS` raro del entorno del usuario es una fuente de fallos que
 *    no se reproducen.
 * 3. **Puerto dinámico**: dos ventanas, dos instancias o un dev server abierto no
 *    deben peleados por 4321.
 * 4. **Readiness por `/api/health`**, no por "el proceso hijo escribió algo": el
 *    retraso hasta que Astro escucha varía con el tamaño del bundle.
 */
export async function startAstroServer({ layout, host = '127.0.0.1', timeoutMs = 20_000 }) {
  const env = pickEnv();

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const port = await freePort(host);
    const url = `http://${host}:${port}`;

    log('arrancando servidor Astro', { entry: layout.entry, cwd: layout.root, port, mode: layout.mode });

    const child = spawn(process.execPath, [layout.entry], {
      cwd: layout.root,
      env: { ...env, ELECTRON_RUN_AS_NODE: '1', HOST: host, PORT: String(port) },
      stdio: ['ignore', 'pipe', 'pipe'],
      // Windows: sin esto aparece una consola negra junto a la ventana.
      windowsHide: true,
    });

    const output = [];
    child.stdout.on('data', (chunk) => output.push(chunk.toString()));
    child.stderr.on('data', (chunk) => output.push(chunk.toString()));

    const ready = await waitUntilReady(url, timeoutMs, child);

    if (ready === true) {
      child.stdout.resume();
      child.stderr.resume();
      const stop = makeStopper(child);
      log('servidor Astro listo', { url });
      return { url, port, child, stop, output };
    }

    // EADDRINUSE en loopback es raro pero real: se reintenta una vez con otro puerto.
    const crashed = child.exitCode !== null;
    log('el servidor no arrancó', { ready, crashed, attempt });
    if (!crashed) stopNow(child);
    if (attempt === 1) {
      return { url: null, port: null, child, stop: () => {}, output: output.join('') };
    }
  }

  return { url: null, port: null, child: null, stop: () => {}, output: '' };
}

async function waitUntilReady(url, timeoutMs, child) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) return false;
    try {
      const response = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(500) });
      if (response.ok) return true;
    } catch {
      /* todavía no escucha */
    }
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
  return false;
}

function makeStopper(child) {
  let stopped = false;
  return () => {
    if (stopped || child.exitCode !== null) return;
    stopped = true;
    child.kill('SIGTERM');
    // Si en 2 s no se fue, no se le espera: un stream colgado no justifica un
    // proceso huérfano.
    const killer = setTimeout(() => {
      if (child.exitCode === null) child.kill('SIGKILL');
    }, 2_000);
    killer.unref?.();
  };
}

function stopNow(child) {
  if (child.exitCode === null) child.kill('SIGKILL');
}

/** Allowlist: lo justo para que Node y Astro funcionen. */
function pickEnv() {
  const keep = ['PATH', 'HOME', 'USER', 'LANG', 'LC_ALL', 'TMPDIR', 'TEMP', 'TMP', 'SYSTEMROOT', 'WINDIR', 'COMSPEC', 'APPDATA', 'LOCALAPPDATA', 'USERPROFILE', 'XDG_', 'DISPLAY', 'WAYLAND_DISPLAY'];
  const out = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value === undefined) continue;
    if (keep.some((prefix) => key === prefix || key.startsWith(prefix))) out[key] = value;
  }
  return out;
}
