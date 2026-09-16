/**
 * @file scripts/launch-smoke.mjs
 * @description Lanza `scripts/electron-smoke.mjs` como proceso principal de Electron.
 *
 * Existe solo por el sandbox de Linux: ver `lib/electron-sandbox-env.mjs`. Sin
 * este paso intermedio, `npm run verify:electron` aborta con SIGTRAP en cualquier
 * máquina cuyo `chrome-sandbox` no sea SUID-root, y el guardián del CSP —y del
 * relay y de la hidratación— no se ejecutaría nunca.
 */
import { spawn } from 'node:child_process';
import process from 'node:process';

import { electronSandboxEnv } from './lib/electron-sandbox-env.mjs';

const extraEnv = electronSandboxEnv(process.cwd());
if (extraEnv.ELECTRON_DISABLE_SANDBOX !== undefined) {
  console.warn(
    '[smoke] chrome-sandbox no es SUID-root: Electron corre sin sandbox del renderer.\n' +
      '[smoke] El puente de preload y el CSP se comprueban igual; el aislamiento de proceso, no.',
  );
}

const child = spawn('npx', ['electron', 'scripts/electron-smoke.mjs'], {
  stdio: 'inherit',
  env: { ...process.env, ...extraEnv },
  shell: process.platform === 'win32',
});

child.on('error', (error) => {
  console.error('[smoke] no se pudo lanzar Electron:', error.message);
  process.exit(1);
});
child.on('exit', (code, signal) => process.exit(signal !== null ? 1 : (code ?? 1)));
