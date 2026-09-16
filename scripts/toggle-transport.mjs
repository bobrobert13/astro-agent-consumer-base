/**
 * @file scripts/toggle-transport.ts (`.mjs`)
 * @description Escribe `PUBLIC_AGENT_TRANSPORT` en `.env.local` para alternar entre
 * el chat simulado y el backend real, sin editar `.env` a mano.
 *
 * Por qué `.env.local` y no `.env`: `.env` no está versionado (lo ignora
 * `.gitignore`; lo único versionado es `.env.example`, la plantilla), pero puede
 * llevar ajustes personales de quien trabaja el repo. `.env.local` tiene
 * prioridad en Astro, así que la alternancia no pisa nada de nadie.
 *
 * Uso: `npm run transport:mock` | `npm run transport:mastra`
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const VALID = new Set(['mock', 'mastra']);
const target = process.argv[2] ?? '';

if (!VALID.has(target)) {
  console.error(`uso: node scripts/toggle-transport.mjs <mock|mastra>  (recibido: "${target}")`);
  process.exit(1);
}

const FILE = '.env.local';
const lines = existsSync(FILE) ? readFileSync(FILE, 'utf8').split('\n') : [];

const key = 'PUBLIC_AGENT_TRANSPORT';
const index = lines.findIndex((line) => new RegExp(`^\\s*${key}\\s*=`).test(line));
const declaration = `${key}=${target}`;

if (index === -1) lines.push(declaration);
else lines[index] = declaration;

// Comentario explicativo al lado del valor: es la línea que alguien va a tocar.
const withNote = lines.map((line) =>
  line === declaration ? `${declaration}   # alternado por scripts/toggle-transport.mjs` : line
);

writeFileSync(FILE, `${withNote.join('\n').replace(/\n+$/, '')}\n`, 'utf8');

console.log(`transporte → ${target}`);
console.log(
  target === 'mastra'
    ? 'Recuerda: el backend debe escuchar en MASTRA_URL (default http://localhost:4111) y `npm run dev` reinicia para tomar el cambio.'
    : 'No hace falta ningún backend: el chat genera tokens simulados.'
);
