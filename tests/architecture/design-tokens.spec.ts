/**
 * @file tests/architecture/design-tokens.spec.ts
 * @description Guardián de la capa visual: `src/styles/theme.css` es la única
 * fuente y las utilidades se eligen desde su escala.
 *
 * Estos invariantes no son estéticos, son de mantenimiento. El repo tenía tres
 * tamaños de letra escritos a mano (`text-[0.6875rem]`) en tres archivos y tres
 * `text-white` ignorando el token `--aac-on-brand`: exactamente el tipo de copia
 * que hace que un rediseño sean treinta ediciones en vez de una. Un test lo
 * convierte en un error de build en lugar de una revisión de código.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * `fileURLToPath` y no `new URL(...).pathname`: en Windows el `pathname` de una
 * URL de fichero llega como `/C:/ruta`, y al pasarlo por `join` el resultado es
 * `C:\C:\ruta` — un ENOENT que parecía un fallo del guardián y era del camino.
 */
const SRC = fileURLToPath(new URL('../../src/', import.meta.url));

/**
 * Excepción, y por qué: `src/components/ui` lo genera el CLI de shadcn-vue, así que
 * editarlo a mano rompe `add`. El resto del repo, **páginas incluidas**, pasa por
 * el guardián: las pantallas heredadas que lo obligaban a excluirse ya no están.
 */
const EXCLUDED = ['components/ui'];

function sourceFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      // `relative` + separadores normalizados: `EXCLUDED` se escribe con `/`, y
      // cortar por longitud de `SRC` dependía de si la URL traía barra final.
      const relativePath = relative(SRC, full).replace(/\\/g, '/');
      if (EXCLUDED.some((excluded) => relativePath.startsWith(excluded))) continue;
      sourceFiles(full, found);
    } else if (entry.endsWith('.astro') || entry.endsWith('.vue')) {
      found.push(full);
    }
  }
  return found;
}

const files = sourceFiles(SRC).map((path) => ({ path, code: readFileSync(path, 'utf8') }));
const theme = readFileSync(fileURLToPath(new URL('../../src/styles/theme.css', import.meta.url)), 'utf8');

describe('tokens de diseño', () => {
  it('encuentra archivos que revisar (el guardián no se apaga solo)', () => {
    // Si un refactor mueve las carpetas, `sourceFiles` devolvería una lista vacía
    // y los dos tests de abajo pasarían sin comprobar nada.
    expect(files.length).toBeGreaterThan(10);
  });

  it('ningún tamaño de letra arbitrario ni blanco literal', () => {
    const offenders = files
      .filter(({ code }) => /text-\[/.test(code) || /(^|["'\s])text-white(["'\s]|$)/.test(code))
      .map(({ path }) => path.slice(SRC.length));

    // La regla del repo: si algo necesita un `text-[13px]`, falta un token.
    expect(offenders).toEqual([]);
  });

  it('toda la escala tipográfica tiene su interlineado declarado', () => {
    // El grupo no admite `--`, así que no se cuelan los modificadores
    // (`--text-body--line-height`) como si fueran tamaños.
    const sizes = [...theme.matchAll(/^\s*--text-([a-z0-9]+(?:-[a-z0-9]+)*)\s*:/gm)].map((match) => match[1]);
    expect(sizes.length).toBeGreaterThan(5);

    const missing = sizes.filter((name) => !theme.includes(`--text-${name}--line-height:`));
    // Sin interlineado, un titular fluido cambia de tamaño sin cambiar de aire y
    // el texto se ve apretado en pantallas grandes.
    expect(missing).toEqual([]);
  });

  it('la escala tipográfica se declara solo en theme.css', () => {
    const global = readFileSync(fileURLToPath(new URL('../../src/styles/global.css', import.meta.url)), 'utf8');
    expect(global).not.toMatch(/--text-[a-z0-9-]+\s*:/);
  });

  it('ningún color literal en los componentes: todos salen de los tokens', () => {
    const offenders = files
      .filter(({ code }) => /#[0-9a-fA-F]{3,8}\b/.test(code) || /\brgba?\(/.test(code))
      .map(({ path }) => path.slice(SRC.length));

    // `--aac-*` y su mapa semántico viven en `theme.css`. Un hex suelto en un
    // componente es una paleta paralela que el modo oscuro no puede seguir.
    expect(offenders).toEqual([]);
  });

  it('el theme declara los tokens de concepto que el modo oscuro reasigna', () => {
    for (const name of ['--aac-canvas', '--aac-surface', '--aac-elevated', '--aac-line', '--aac-ink', '--aac-ink-muted']) {
      expect(theme).toContain(name);
    }
    // Y los reasigna en los dos caminos: clase forzada y preferencia del sistema.
    expect(theme).toMatch(/\.dark,\s*\n:root\.dark\s*\{/);
    expect(theme).toMatch(/@media \(prefers-color-scheme: dark\)/);
  });
});
