import { app } from 'electron';
import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * @file electron/lib/logger.mjs
 * @description Log en disco del proceso principal.
 *
 * Por qué no basta la consola: empaquetada, la app no tiene consola (y en Windows
 * ni siquiera un sitio donde mirarla). Cuando el servidor Astro no arranca, lo
 * único que ve el usuario es un diálogo de error — por eso ese diálogo incluye la
 * ruta de este archivo.
 */
let file;

function target() {
  if (file === undefined) {
    const dir = app.getPath('logs');
    mkdirSync(dir, { recursive: true });
    file = join(dir, 'astro-agent-consumer.log');
  }
  return file;
}

export function log(message, extra) {
  const line = `[${new Date().toISOString()}] ${message}${extra === undefined ? '' : ` ${safe(extra)}`}\n`;
  try {
    appendFileSync(target(), line, 'utf8');
  } catch {
    /* si no se puede escribir el log, no hay que romper el arranque por eso */
  }
  console.log(line.trimEnd());
}

function safe(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function logPath() {
  return target();
}
