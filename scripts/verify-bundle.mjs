/**
 * @file scripts/verify-bundle.mjs
 * @description Guardián de lo que NO puede entrar en el grafo estático de la isla.
 *
 * Cambió de aserto con el paso al AI SDK, y conviene tenerlo claro al leerlo:
 * antes vigilaba que el cliente del proveedor (`@mastra/client-js`) quedara en un
 * chunk **diferido**, porque la isla no debía pagarlo hasta el primer prompt.
 * Ahora el núcleo de la isla **es** el AI SDK (`useChat`), así que ese aserto ya no
 * significa nada: lo que se vigila es que el grafo inicial no arrastre **nada de
 * servidor** — ni el cliente del proveedor, ni los nombres de las variables de
 * entorno, ni el host del backend.
 *
 * Los tests unitarios no pueden comprobarlo (no hay bundle) y `astro build` no lo
 * rechaza: es una regresión silenciosa que solo se paga cuando alguien abre la app.
 *
 * Cómo lo hace: Astro ya no deja el HTML de las rutas SSR en `dist/client`, así que
 * el chunk de entrada de la isla se localiza por un literal que solo aparece en su
 * JSX, y desde ahí se recorren **solo imports estáticos** (un `import("./otro.js")`
 * se cuenta como diferido).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ASSET_DIR = 'dist/client/_astro';
const ISLAND_MARKER = 'Conversación con el agente';

/**
 * Lo que jamás debe aparecer en el grafo inicial de la isla. No es una lista de
 * "código pesado" sino de **código de servidor o secreto**: si alguno sale aquí,
 * el módulo que lo contiene cruzó una frontera que el test de arquitectura no ve
 * porque se resuelve en el bundler, no en el fuente.
 */
const FORBIDDEN_MARKERS = [
  'MastraClient', // el cliente del proveedor: el navegador ya no habla con Mastra
  '@mastra/core',
  'MASTRA_URL',
  'MASTRA_API_KEY',
  'localhost:4111', // el host por defecto del backend, último síntoma de filtración
];

const chunks = new Map();
for (const file of readdirSync(ASSET_DIR)) {
  if (!file.endsWith('.js')) continue;
  chunks.set(file, readFileSync(join(ASSET_DIR, file), 'utf8'));
}

if (chunks.size === 0) {
  fail(`no hay chunks en ${ASSET_DIR}: ejecuta \`npm run build\` antes de verificar`);
}

const entry = [...chunks].find(([, code]) => contains(code, [ISLAND_MARKER]));
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

const leaked = [...seen].filter((name) => contains(chunks.get(name) ?? '', FORBIDDEN_MARKERS));

if (leaked.length > 0) {
  fail(
    `el grafo estático de la isla arrastra código de servidor o secretos: ${leaked.join(', ')}. ` +
      'Los módulos bajo `server/` y `@shared/env/server` solo pueden importarse desde `src/pages/api/**`.'
  );
}

const bytes = [...seen].reduce((total, name) => total + sizeOf(name), 0);

console.log(`  ok     ningún marcador prohibido en el cierre estático de la isla.`);
console.log(`  ok     cierre estático de la isla = ${seen.size} chunk(s), ${(bytes / 1024).toFixed(0)} KB.`);

function sizeOf(name) {
  return statSync(join(ASSET_DIR, name)).size;
}

function contains(code, needles) {
  return needles.some((needle) => code.includes(needle));
}

function fail(message) {
  console.error(`\nFAIL verify-bundle: ${message}`);
  process.exit(1);
}
