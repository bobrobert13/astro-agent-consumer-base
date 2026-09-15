/**
 * @file scripts/electron-dev.mjs
 * @description Orquestador del modo desarrollo del shell de escritorio.
 *
 * Por qué "probe primero" en vez de lanzar `astro dev` a ciegas: `astro dev`
 * escribe un lockfile y **se niega a arrancar** si ya hay otro servidor del
 * proyecto corriendo. Passar `--ignore-lock` partiría el estado del servidor que
 * el usuario ya tiene abierto, así que se pregunta antes y se reutiliza.
 *
 * El `astro dev` hijo se lanza **sin** `--background`, para que muera con este
 * proceso padre: un daemon huérfano escuchando en 4321 es la causa nº 1 de
 * "pero si yo cerré la app".
 */
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const DEV_URL = process.env.AAC_DEV_URL ?? 'http://127.0.0.1:4321';
const children = [];
let shuttingDown = false;

main().catch((error) => {
  console.error('[electron-dev] fallo:', error);
  shutdown(1);
});

async function main() {
  const alreadyUp = await probe(`${DEV_URL}/api/health`);
  if (alreadyUp) {
    console.log(`[electron-dev] reutilizando el servidor de desarrollo en ${DEV_URL}`);
  } else {
    console.log('[electron-dev] levantando astro dev…');
    spawnOrFail('npx', ['astro', 'dev', '--strictPort'], { label: 'astro dev' });
    const up = await waitUntil(async () => probe(`${DEV_URL}/api/health`), 30_000);
    if (!up) throw new Error('astro dev no llegó a responder en 30 s.');
  }

  console.log('[electron-dev] abriendo la ventana de Electron…');
  const electron = spawnOrFail('npx', ['electron', '.'], {
    label: 'electron',
    env: { ELECTRON_START_URL: DEV_URL },
  });

  await new Promise((resolve) => {
    electron.on('exit', resolve);
  });
  shutdown(0);
}

function spawnOrFail(command, args, { label, env = {} }) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    env: { ...process.env, ...env },
    shell: process.platform === 'win32',
  });
  child.on('error', (error) => {
    console.error(`[electron-dev] no se pudo lanzar ${label}:`, error.message);
    shutdown(1);
  });
  children.push({ label, child });
  return child;
}

async function probe(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(600) });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitUntil(check, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await check()) return true;
    await sleep(300);
  }
  return false;
}

function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const { label, child } of children) {
    if (child.exitCode === null) {
      console.log(`[electron-dev] cerrando ${label}`);
      child.kill('SIGTERM');
    }
  }
  setTimeout(() => {
    for (const { child } of children) if (child.exitCode === null) child.kill('SIGKILL');
    process.exit(code);
  }, 1500).unref?.();
  if (code === 0) setTimeout(() => process.exit(0), 100).unref?.();
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => shutdown(0));
}
