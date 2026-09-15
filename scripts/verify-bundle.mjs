/**
 * Única fuente de verdad del aserto "el cliente del proveedor no está en el
 * chunk inicial de la isla".
 *
 * Los tests unitarios no pueden comprobarlo (no hay bundle) y `astro build` no lo
 * rechaza: es una regresión silenciosa que solo se paga cuando alguien abre la
 * app. Por eso vive como script de verificación, en el DoD.
 *
 * Cómo lo hace: Astro ya no deja el HTML de las rutas SSR en `dist/client`, así
 * que el chunk de entrada de la isla se localiza por un literal que solo aparece
 * en su JSX, y desde ahí se recorren **solo imports estáticos** (un
 * `import("./otro.js")` se considera diferido, que es lo que queremos).
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ASSET_DIR = 'dist/client/_astro';
const ISLAND_MARKER = 'Conversación con el agente';
const PROVENANCE_MARKERS = ['@mastra/core', 'MastraClient', 'processDataStream'];

const chunks = new Map();
for (const file of readdirSync(ASSET_DIR)) {
  if (!file.endsWith('.js')) continue;
  chunks.set(file, readFileSync(join(ASSET_DIR, file), 'utf8'));
}

if (chunks.size === 0) {
  fail(`no hay chunks en ${ASSET_DIR}: ejecuta \`npm run build\` antes de verificar`);
}

const entry = [...chunks].find(([, code]) => contains(code, PROVENANCE_MARKERS) === false && contains(code, [ISLAND_MARKER]));
if (entry === undefined) {
  fail(
    `no se encontró el chunk de la isla (marcador "${ISLAND_MARKER}"). ` +
      'Si la isla cambió de texto o dejó de ser `client:only`, actualiza el marcador.'
  );
}

// Cierre transitivo por imports estáticos.
const seen = new Set();
const queue = [entry[0]];
while (queue.length > 0) {
  const name = queue.shift();
  if (name === undefined || seen.has(name)) continue;
  seen.add(name);

  const code = chunks.get(name) ?? '';
  for (const match of code.matchAll(/from\s*["']\.\/([A-Za-z0-9_.-]+)["']/g)) {
    const target = match[1];
    if (target !== undefined && chunks.has(target)) queue.push(target);
  }
}

const leaked = [...seen].filter((name) => contains(chunks.get(name) ?? '', PROVENANCE_MARKERS));
const deferred = [...chunks.keys()].filter((name) => contains(chunks.get(name) ?? '', PROVENANCE_MARKERS));

if (leaked.length > 0) {
  fail(
    `el cliente del proveedor está en el grafo estático de la isla: ${leaked.join(', ')}. ` +
      'Debe cargarse con `await import()` dentro de transport/mastra.ts.'
  );
}

if (deferred.length === 0) {
  console.log('  aviso  ningún chunk contiene el cliente del proveedor.');
  console.log('           Ok si el build se hizo sin referenciarlo; Comprueba que transport/mastra.ts sigue importado dinámicamente.');
} else {
  console.log(`  ok     ${deferred.length} chunk(s) diferido(s) con el cliente del proveedor, fuera del grafo inicial de la isla.`);
}

console.log(`  ok     verify-bundle: cierre estático de la isla = ${seen.size} chunk(s)`);

function contains(code, needles) {
  return needles.some((needle) => code.includes(needle));
}

function fail(message) {
  console.error(`\nFAIL verify-bundle: ${message}`);
  process.exit(1);
}
