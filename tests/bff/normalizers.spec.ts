/**
 * @file tests/bff/normalizers.spec.ts
 * @description Los normalizadores son la frontera real contra el proveedor: si
 * cambian su forma de responder, esto es lo que absorbe el golpe. Se prueba sobre
 * las tres formas que Mastra ha usado y sobre el recorte de campos.
 */
import { describe, expect, it } from 'vitest';

import { listAgents } from '@domains/agent-registry/server/list-agents';
import { listThreads } from '@domains/agent-sessions/server/list-threads';
import { parseRunRequest } from '@domains/agent-chat/server/normalize-agent-run';
import { resolveScope, sanitizeThread } from '@domains/agent-chat/server/session-scope';
import { agentListSchema } from '@domains/agent-chat/server/normalize-agent-run';

describe('parseRunRequest', () => {
  it('acepta un body mínimo y separa config', () => {
    const result = parseRunRequest({ prompt: 'hola', thread: 't1', config: { temperature: 0.2 } });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({ prompt: 'hola', thread: 't1', config: { temperature: 0.2 } });
    }
  });

  it('rechaza el prompt vacío con el mensaje del schema', () => {
    const result = parseRunRequest({ prompt: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.statusCode).toBe(400);
      expect(result.error.field).toBe('prompt');
    }
  });

  it('rechaza basura que ni siquiera es objeto', () => {
    expect(parseRunRequest('texto').ok).toBe(false);
    expect(parseRunRequest(undefined).ok).toBe(false);
  });

  it('no deja pasar claves desconocidas hacia el upstream', () => {
    const result = parseRunRequest({ prompt: 'hola', resourceId: 'victima' });
    expect(result.ok).toBe(true);
    if (result.ok) expect('resourceId' in result.data).toBe(false);
  });
});

describe('sanitizeThread', () => {
  it('normaliza ausentes y basura de ruta', () => {
    expect(sanitizeThread(undefined)).toBe('nuevo');
    // Sin `/` y sin puntos iniciales: ya no se parece a una ruta relativa.
    expect(sanitizeThread('../../etc')).toBe('etc');
    expect(sanitizeThread('  ')).toBe('nuevo');
    expect(sanitizeThread('ok-1_2.3')).toBe('ok-1_2.3');
    expect(sanitizeThread('.oculto')).toBe('oculto');
  });

  it('recorta longitudes absurdas', () => {
    expect(sanitizeThread('a'.repeat(500))).toHaveLength(96);
  });
});

describe('resolveScope', () => {
  it('toma el resource de la cookie propia y lo antepone al del cliente', () => {
    const request = new Request('http://localhost/api/sessions', {
      headers: { cookie: 'otros=no; aac_resource=usuario-7' },
    });
    expect(resolveScope(request, 't1')).toEqual({ resource: 'usuario-7', thread: 't1' });
  });

  it('cae en identidad anónima si no hay cookie', () => {
    expect(resolveScope(new Request('http://localhost/api/sessions')).resource).toBe('anonymous');
  });
});

describe('listAgents / normalización', () => {
  it('descarta la forma desconocida en vez de reventar la vista', async () => {
    // `fetch` global no apunta a ningún servidor en los tests de normalizadores:
    // se simula la respuesta del upstream.
    const original = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ inesperado: true }), { headers: { 'content-type': 'application/json' } })) as typeof fetch;

    await expect(listAgents()).resolves.toMatchObject({ ok: true, data: [] });
    globalThis.fetch = original;
  });
});

describe('listThreads / normalización', () => {
  it('devuelve la página vacía si el upstream no entiende nada', async () => {
    const original = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(JSON.stringify([]), { headers: { 'content-type': 'application/json' } })) as typeof fetch;

    const result = await listThreads('usuario-7');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toEqual({ items: [], total: 0 });

    globalThis.fetch = original;
  });
});

describe('agentListSchema', () => {
  it('recorta las claves que el navegador no debe ver', () => {
    const parsed = agentListSchema.parse({
      agents: {
        research: { id: 'research', name: 'Investigación', description: '', instructions: 'SECRETO', cost: 12 },
      },
    });
    const research = parsed.agents?.['research'];
    expect(research).toEqual({ id: 'research', name: 'Investigación', description: '' });
    expect(JSON.stringify(parsed)).not.toContain('SECRETO');
  });
});
