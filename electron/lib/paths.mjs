import { app } from 'electron';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * @file electron/lib/paths.mjs
 * @description Dónde está el servidor Astro construido, en dev y en el paquete.
 *
 * En producción el `dist/` **no** puede estar dentro de `app.asar`: el servidor
 * Astro se ejecuta como proceso hijo con `ELECTRON_RUN_AS_NODE`, y ese proceso no
 * lleva el parche de `fs` que pone asar en las rutas. Además `send` (dependencia
 * del adapter de Node) hace `fs.stat` para servir los estáticos. Por eso
 * `electron-builder.yml` lo copia con `extraResources` a `resources/astro`.
 */
export function resolveAstroLayout({ dev }) {
  if (dev) {
    const root = resolve(app.getAppPath(), '..');
    return { mode: 'dev', root, entry: join(root, 'dist/server/entry.mjs'), client: join(root, 'dist/client') };
  }

  const base = join(process.resourcesPath, 'astro');
  return { mode: 'prod', root: base, entry: join(base, 'server/entry.mjs'), client: join(base, 'client') };
}

/** El layout solo sirve si el build existe; si no, el error debe ser temprano. */
export function assertBuilt(layout) {
  if (!existsSync(layout.entry)) {
    throw new Error(
      `No se encontró el servidor construido en ${layout.entry}. Ejecuta \`npm run build\` antes de abrir la app de escritorio.`
    );
  }
  return layout;
}
