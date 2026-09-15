/**
 * @file tests/architecture/ipc-channels.spec.ts
 * @description Guarda la coherencia de los nombres de canal entre los tres lados
 * del puente de escritorio.
 *
 * El preload no puede importar `lib/ipc.mjs` (un preload sandboxeado tiene
 * `require` restringido), así que repite los literales. Repetición aceptable; que
 * diverjan sin que nadie se entere, no. Este test falla si un canal cambia en un
 * lado y no en los otros, y corre en Node puro, sin Electron.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const libSource = readFileSync('electron/lib/ipc.mjs', 'utf8');
const preloadSource = readFileSync('electron/preload.cjs', 'utf8');
const typesSource = readFileSync('src/shared/desktop/types.ts', 'utf8');

/** Todos los literales `'desktop:…'` / `'menu:…'` / `'window:…'` de un archivo. */
function channelsIn(source: string): string[] {
  return [...source.matchAll(/['"]((?:desktop|menu|window):[a-z-]+)['"]/g)]
    .map((match) => match[1])
    .filter((value): value is string => value !== undefined)
    .sort();
}

describe('contrato del puente de escritorio', () => {
  it('el preload usa exactamente los canales declarados en lib/ipc.mjs', () => {
    const declared = new Set(channelsIn(libSource));
    const used = new Set(channelsIn(preloadSource));

    // `desktop:bootstrap` etc. deben existir en ambos; los eventos entrantes del
    // main (`menu:action`) se declaran en el allowlist del preload.
    const missing = [...used].filter((channel) => !declared.has(channel));
    expect(missing, `canales en preload.cjs que no están en lib/ipc.mjs: ${missing.join(', ')}`).toEqual([]);
  });

  it('los canales que ve el TypeScript coinciden con los declarados', () => {
    const typed = channelsIn(typesSource);
    const declared = channelsIn(libSource);
    for (const channel of typed) {
      expect(declared, `el tipo menciona ${channel} pero lib/ipc.mjs no lo declara`).toContain(channel);
    }
  });

  it('el preload no expone ipcRenderer crudo ni getters', () => {
    expect(preloadSource).not.toMatch(/ipcRenderer,\s*ipcRenderer|exposeInMainWorld\(['"]ipc/);
    // `contextBridge` ignora descriptores: un getter aquí significa puente muerto.
    expect(preloadSource).not.toMatch(/^\s*get\s+\w+\(\)\s*\{/m);
  });
});
