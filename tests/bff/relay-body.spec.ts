/**
 * @file tests/bff/relay-body.spec.ts
 * @description La identidad de memoria la fija el servidor.
 *
 * El cuerpo que llega al relay lo construye el cliente del proveedor, así que el
 * `resource` viaja dentro de un JSON ajeno. Lo que se protege aquí es que ese
 * valor **nunca** lo decida el navegador: si vuelve a colarse, dos personas
 * comparten historial y ningún test de UI lo notaría.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { relayStream, resolveScope } from '@domains/agent-chat/server';
import { withServerScope } from '@domains/agent-chat/server/relay-body';

const scope = { resource: 'servidor-1', thread: 't-9', setCookie: undefined };

describe('withServerScope', () => {
  it('impone el resource y el hilo del servidor sobre los del cliente', () => {
    const rewritten = withServerScope(
      { messages: [], memory: { thread: 'ajeno', resource: 'victima' } },
      scope
    ) as { memory: Record<string, unknown> };

    expect(rewritten.memory['resource']).toBe('servidor-1');
    expect(rewritten.memory['thread']).toBe('t-9');
  });

  it('deja intacto un cuerpo que no sabe interpretar', () => {
    // Identidad por referencia: es lo que permite al relay reenviar los bytes
    // originales en vez de reserializar de más.
    const foreign = { data: { anything: true } };
    expect(withServerScope(foreign, scope)).toBe(foreign);
    expect(withServerScope('texto', scope)).toBe('texto');
    expect(withServerScope([1, 2], scope)).toBeInstanceOf(Array);
  });
});

describe('relayStream y la identidad', () => {
  afterEach(() => vi.unstubAllGlobals());

  function upstream(): ReturnType<typeof vi.fn> {
    const mock = vi.fn().mockResolvedValue(new Response('data: ok\n\n', { headers: { 'content-type': 'text/event-stream' } }));
    vi.stubGlobal('fetch', mock);
    return mock;
  }

  it('reescribe el resource del cliente antes de reenviar', async () => {
    const fetchMock = upstream();
    const request = new Request('http://localhost/api/agent-rpc/stream/research', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: 'aac_resource=de-la-cookie' },
      body: JSON.stringify({ memory: { thread: 'x', resource: 'lo-que-diga-el-navegador' } }),
    });

    await relayStream(request, { path: 'stream/research' });

    const sent = JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body)) as {
      memory: { resource: string; thread: string };
    };
    expect(sent.memory.resource).toBe('de-la-cookie');
  });

  it('acuna identidad y la fija en el navegador cuando no habia cookie', async () => {
    const fetchMock = upstream();
    const request = new Request('http://localhost/api/agent-rpc/agents', { method: 'GET' });

    const response = await relayStream(request, { path: 'agents' });

    const cookie = response.headers.get('set-cookie') ?? '';
    expect(cookie).toContain('aac_resource=');
    expect(cookie).toContain('HttpOnly');
    // La cookie del upstream NO puede llegar al navegador (fuga de sesión del
    // backend); la nuestra sí, porque es la identidad de este navegador.
    expect(cookie).not.toContain('session');
    expect(((fetchMock.mock.calls[0]?.[1] as RequestInit).headers as Headers).get('cookie')).toBeNull();
  });

  it('sanea el hilo que manda el cliente en vez de reenviarlo crudo', async () => {
    const fetchMock = upstream();
    const request = new Request('http://localhost/api/agent-rpc/stream/research', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ memory: { thread: '../../etc/passwd' } }),
    });

    await relayStream(request, { path: 'stream/research' });

    const sent = JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body)) as {
      memory: { thread: string };
    };
    expect(sent.memory.thread).toBe('etcpasswd');
  });

  it('rechaza con 413 un cuerpo por encima del techo, sin llamar al upstream', async () => {
    const fetchMock = upstream();
    const request = new Request('http://localhost/api/agent-rpc/stream/research', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'content-length': String(1024 * 1024) },
      body: JSON.stringify({ prompt: 'x' }),
    });

    const response = await relayStream(request, { path: 'stream/research' });

    expect(response.status).toBe(413);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reenvia tal cual un cuerpo que no puede interpretar como JSON', async () => {
    const fetchMock = upstream();
    const request = new Request('http://localhost/api/agent-rpc/stream/research', {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: 'no soy json',
    });

    await relayStream(request, { path: 'stream/research' });

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit & { duplex?: string };
    // Un cuerpo opaco sigue yendo en streaming, y undici exige `duplex`.
    expect(init.duplex).toBe('half');
    expect(await new Response(init.body as ReadableStream).text()).toBe('no soy json');
  });
});

describe('resolveScope', () => {
  it('acuña una identidad nueva si no hay cookie y pide fijarla', () => {
    const first = resolveScope(new Request('http://localhost/api/sessions'));
    expect(first.resource).not.toBe('anonymous');
    expect(first.setCookie).toContain(first.resource);

    // Dos navegadores distintos no comparten memoria.
    const second = resolveScope(new Request('http://localhost/api/sessions'));
    expect(second.resource).not.toBe(first.resource);
  });

  it('no vuelve a pedir la cookie si ya venía', () => {
    const request = new Request('http://localhost/api/sessions', {
      headers: { cookie: 'aac_resource=usuario-7' },
    });
    const scope = resolveScope(request, 't1');
    expect(scope).toMatchObject({ resource: 'usuario-7', thread: 't1' });
    expect(scope.setCookie).toBeUndefined();
  });
});
