/**
 * @file tests/architecture/boundaries.spec.ts
 * @description El guardián del slicing vertical.
 *
 * Una regla de arquitectura que solo vive en un `AGENTS.md` se rompe en el primer
 * sprint. Este test recorre el fuente con regex sobre los `import` y falla con un
 * mensaje que dice qué archivo mover. Se prefiere sobre
 * `no-restricted-imports` de ESLint porque las patterns de esa regla no expresan
 * "hermano distinto del barrel", y porque aquí también se puede comprobar lo que
 * ESLint no ve (qué módulos de servidor no pueden aparecer en el grafo del
 * navegador).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const SRC = join(ROOT, 'src');

interface Module {
  /** Ruta relativa a la raíz del repo, con `/`. */
  path: string;
  code: string;
}

/** Especificadores importados, incluyendo los relativos. */
function importsOf(code: string): string[] {
  const patterns = [
    /(?:^|\n)\s*import\s+(?:type\s+)?[^'"\n]*?from\s*['"]([^'"]+)['"]/g,
    /(?:^|\n)\s*export\s+(?:\*|\{[^}]*\})\s*from\s*['"]([^'"]+)['"]/g,
    /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];
  const found: string[] = [];
  for (const pattern of patterns) {
    for (const match of code.matchAll(pattern)) {
      const specifier = match[1];
      if (specifier !== undefined) found.push(specifier);
    }
  }
  return found;
}

function walk(dir: string, out: Module[] = []): Module[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === 'components' && full.includes(`${sep}domains`)) {
        walk(full, out);
        continue;
      }
      walk(full, out);
      continue;
    }
    if (!/\.(ts|astro|vue|mjs)$/.test(entry) || entry.endsWith('.d.ts')) continue;
    const path = relative(ROOT, full).split(sep).join('/');
    out.push({ path, code: readFileSync(full, 'utf8') });
  }
  return out;
}

const modules = walk(SRC);

/** `A/B` si el path está bajo `src/domains/`. */
function domainOf(path: string): string | undefined {
  const match = /^src\/domains\/([^/]+)/.exec(path);
  return match?.[1];
}

function isServerModule(path: string): boolean {
  return /(^|\/)server(\/|$)/.test(path) || path.startsWith('src/pages/api/');
}

describe('fronteras entre bounded contexts', () => {
  it('recorre un número razonable de módulos', () => {
    // Salvaguardia del propio test: si el walker se rompe, no debe pasar en verde.
    expect(modules.length).toBeGreaterThan(20);
  });

  it('una slice solo importa de otra a través de sus barrels', () => {
    const offenders: string[] = [];

    for (const module of modules) {
      const own = domainOf(module.path);
      for (const specifier of importsOf(module.code)) {
        if (!specifier.startsWith('@domains/')) continue;
        const target = specifier.slice('@domains/'.length);
        const [targetDomain] = target.split('/');
        if (targetDomain === undefined || targetDomain === own) continue;

        const subpath = target.slice(targetDomain.length);
        const allowed = subpath === '' || subpath === '/server';
        if (!allowed) offenders.push(`${module.path} → ${specifier}`);
      }
    }

    expect(offenders, `importar internos de otra slice rompe el contexto acotado.\n${offenders.join('\n')}`).toEqual([]);
  });

  it('ningún módulo escapa de su slice con rutas relativas', () => {
    const offenders: string[] = [];

    for (const module of modules) {
      const own = domainOf(module.path);
      if (own === undefined) continue;

      for (const specifier of importsOf(module.code)) {
        if (!specifier.startsWith('.')) continue;
        const resolved = join(SRC, 'domains', own, specifier).split(sep).join('/');
        const escaped = /^src\/domains\/([^/]+)/.exec(resolved.slice(SRC.length + 1));
        if (escaped?.[1] !== undefined && escaped[1] !== own) {
          offenders.push(`${module.path} → ${specifier} (cae en ${escaped[1]})`);
        }
      }
    }

    expect(offenders, `usa @domains/<slice> en vez de saltar entre carpetas.\n${offenders.join('\n')}`).toEqual([]);
  });

  it('el código de cliente nunca importa entorno de servidor ni el upstream', () => {
    const forbidden = ['@shared/env/server', '@shared/server/upstream', '@shared/server/fetch-json'];
    const offenders: string[] = [];

    for (const module of modules) {
      if (isServerModule(module.path)) continue;
      for (const specifier of importsOf(module.code)) {
        if (forbidden.includes(specifier)) offenders.push(`${module.path} → ${specifier}`);
      }
    }

    expect(
      offenders,
      `filtraría secretos o la URL del backend al bundle del navegador.\n${offenders.join('\n')}`
    ).toEqual([]);
  });

  it('shared no depende de ninguna slice', () => {
    const offenders: string[] = [];

    for (const module of modules) {
      if (!module.path.startsWith('src/shared/')) continue;
      for (const specifier of importsOf(module.code)) {
        if (specifier.startsWith('@domains/') || specifier.includes('/domains/')) {
          offenders.push(`${module.path} → ${specifier}`);
        }
      }
    }

    expect(offenders, `el kernel mira hacia arriba.\n${offenders.join('\n')}`).toEqual([]);
  });

  it('páginas, layouts y componentes solo ven barrels de slice', () => {
    const offenders: string[] = [];

    for (const module of modules) {
      if (!/^src\/(pages|layouts|components)\//.test(module.path)) continue;
      for (const specifier of importsOf(module.code)) {
        if (!specifier.startsWith('@domains/')) continue;
        const target = specifier.slice('@domains/'.length);
        const depth = target.split('/').filter(Boolean).length;
        // `agent-chat` (barrel cliente) o `agent-chat/server` (barrel servidor).
        if (depth > 2 || (depth === 2 && !target.endsWith('/server'))) offenders.push(`${module.path} → ${specifier}`);
      }
    }

    expect(offenders, `expónlo por el index.ts del slice.\n${offenders.join('\n')}`).toEqual([]);
  });

  it('ningún módulo nombra el cliente del proveedor: el navegador no habla con Mastra', () => {
    // Antes esta regla aislaba `@mastra/client-js` en `transport/mastra.ts`. Con el
    // AI SDK ese archivo desapareció: el chat pasa por el BFF y el navegador no
    // tiene por qué poder nombrar Mastra ni siquiera en un import muerto.
    const offenders = modules
      .filter((module) => /['"]@mastra\/(client-js|core)/.test(module.code))
      .map((module) => module.path);

    expect(
      offenders,
      `el navegador solo habla con el BFF: si necesitas algo de Mastra, va detrás de src/pages/api.\n${offenders.join('\n')}`
    ).toEqual([]);
  });

  it('ningún componente .vue conoce el vocabulario del AI SDK', () => {
    // La vista consume `ChatMessage`, no `UIMessage`. El puente es `ai/`, y esta
    // regla es lo que impide que el vocabulario del SDK se filtre a los
    // componentes en el primer `atajo` que alguien escriba.
    const offenders = modules
      .filter((module) => module.path.endsWith('.vue'))
      .filter((module) => /['"](ai|@ai-sdk\/vue)['"]/.test(module.code))
      .map((module) => module.path);

    expect(offenders, `traduce en ai/adapt-ui-messages.ts, no en la vista.\n${offenders.join('\n')}`).toEqual([]);
  });
});
