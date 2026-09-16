/**
 * @file scripts/lib/electron-sandbox-env.mjs
 * @description Decide si el sandbox de Chromium es utilizable en esta máquina.
 *
 * En Linux el renderer queda aislado solo si `chrome-sandbox` es un binario SUID
 * propiedad de root. Sin eso Electron aborta con SIGTRAP **antes** de ejecutar
 * cualquier línea de la app, así que `npm run verify:electron` y
 * `npm run electron:dev` fallarían en un clon cuyos `node_modules` perdieron el
 * bit SUID (lo normal tras un `npm install`, y más aún en un bind mount de
 * contenedor, donde el owner del árbol no es root).
 *
 * `ELECTRON_DISABLE_SANDBOX=1` es la única vía que funciona: tiene que estar en
 * el entorno antes de arrancar el binario. `app.commandLine.appendSwitch(
 * 'no-sandbox')` ya es tarde —el sandbox se monta en el delegate del proceso
 * principal, no en el arranque de Chromium— y `--no-sandbox` escrito después del
 * script se lo queda la app como argumento propio.
 *
 * Se desactiva solo cuando no hay sandbox disponible, no siempre: si la máquina
 * lo tiene, el smoke sigue probando el `sandbox: true` real de `webPreferences`.
 */
import { statSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

const HELPER = join('node_modules', 'electron', 'dist', 'chrome-sandbox');

/**
 * Variables de entorno que hay que añadir al hijo de Electron. Vacías cuando el
 * sandbox está bien configurado.
 *
 * @param {string} projectRoot directorio donde vive `node_modules/electron`.
 * @returns {Record<string, string>}
 */
export function electronSandboxEnv(projectRoot) {
  if (process.platform !== 'linux' || process.getuid?.() === 0) return {};
  try {
    const stats = statSync(join(projectRoot, HELPER));
    if (stats.uid === 0 && (stats.mode & 0o4000) !== 0) return {};
  } catch {
    /* sin helper: se desactiva abajo */
  }
  return { ELECTRON_DISABLE_SANDBOX: '1' };
}
