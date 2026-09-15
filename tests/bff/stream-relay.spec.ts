/**
 * @file tests/bff/stream-relay.spec.ts
 * @description El relay se prueba importando el handler y pasándole un `Request`
 * real, con `fetch` simulado: sin servidor, sin red, sin Astro.
 *
 * Lo que se protege aquí es la decisión de arquitectura del reenvío verbatim y
 * la fuga de información por cabeceras.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { relayStream } from '@domains/agent-chat/server';

afterEach(() => vi.unstubAllGlobals());

function sseResponse(chunks: string[], headers: Record<string, string> = {}): Response {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
        controller.close();
      },
    }),
    { status: 200, headers: { 'content-type': 'text/event-stream', ...headers } }
  );
}

async function readAll(body: ReadableStream<Uint8Array> | null): Promise<string> {
  if (body === null) return '';
  return new Response(body).text();
}

describe('relayStream', () => {
  it('reescribe el path bajo /api del upstream y devuelve los bytes tal cual', async () => {
    const frames = ['data: {"type":"text-delta"}\n\n', 'data: [DONE]\n\n'];
    const fetchMock = vi.fn().mockResolvedValue(sseResponse(frames));
    vi.stubGlobal('fetch', fetchMock);

    const request = new Request('http://localhost/api/agent-rpc/stream/research', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt: 'hola' }),
    });

    const response = await relayStream(request, { path: 'stream/research' });

    expect(fetchMock.mock.calls[0]?.[0]).toBeInstanceOf(URL);
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe('http://localhost:4111/api/stream/research');
    expect(await readAll(response.body)).toBe(frames.join(''));

    // Regresión cazada por el smoke E2E, no por este test: con `fetch` simulado
    // nada valida el `init`, y en Node reenviar un cuerpo en streaming sin
    // `duplex: 'half'` devuelve 502 en el mundo real.
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit & { duplex?: string };
    expect(init.duplex).toBe('half');
    expect(init.body).toBeInstanceOf(ReadableStream);
  });

  it('no declara duplex ni cuerpo en un GET', async () => {
    const fetchMock = vi.fn().mockResolvedValue(sseResponse(['data: x\n\n']));
    vi.stubGlobal('fetch', fetchMock);

    await relayStream(new Request('http://localhost/api/agent-rpc/agents/research'), {
      path: 'agents/research',
    });

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit & { duplex?: string };
    expect(init.method).toBe('GET');
    // La clave no debe existir: `body: undefined` también dispara la validación
    // de `duplex` en algunos clientes fetch.
    expect('body' in init).toBe(false);
    expect(init.duplex).toBeUndefined();
  });

  it('inyecta la credencial en el upstream y nunca la devuelve al cliente', async () => {
    const fetchMock = vi.fn().mockResolvedValue(sseResponse(['data: ok\n\n']));
    vi.stubGlobal('fetch', fetchMock);

    const request = new Request('http://localhost/api/agent-rpc/stream/x', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });
    const response = await relayStream(request, { path: 'stream/x' });

    const sentHeaders = (fetchMock.mock.calls[0]?.[1] as RequestInit).headers as Headers;
    // Sin MASTRA_API_KEY definida en el stub de env, no hay bearer que filtrar.
    expect(sentHeaders.get('authorization')).toBeNull();
    expect(response.headers.get('set-cookie')).toBeNull();
    expect(response.headers.get('server')).toBeNull();
    expect([...(await readAll(response.body))].join('')).toBe('data: ok\n\n');
  });

  it('fuerza no-cache y desactiva el buffering, aunque el upstream diga otra cosa', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(sseResponse(['data: x\n\n'], { 'cache-control': 'max-age=600' }))
    );

    const response = await relayStream(
      new Request('http://localhost/api/agent-rpc/stream/x', { method: 'POST', body: '{}' }),
      { path: 'stream/x' }
    );

    expect(response.headers.get('cache-control')).toContain('no-transform');
    expect(response.headers.get('x-accel-buffering')).toBe('no');
  });

  it('propaga el abort del cliente hacia el upstream', async () => {
    const controller = new AbortController();
    let seenSignal: AbortSignal | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: URL, init: RequestInit) => {
        seenSignal = init.signal ?? undefined;
        return new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new Error('aborted by client')));
        });
      })
    );

    const request = new Request('http://localhost/api/agent-rpc/stream/x', {
      method: 'POST',
      body: '{}',
      signal: controller.signal,
    });

    const relayed = relayStream(request, { path: 'stream/x' });
    controller.abort();

    // El fetch del relay se rechaza y eso se traduce en 499, no en un 500.
    const response = await relayed;
    expect(seenSignal?.aborted).toBe(true);
    expect(response.status).toBe(499);
  });

  it('rechaza rutas con traversal en vez de reenviarlas', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await relayStream(new Request('http://localhost/api/agent-rpc/x'), {
      path: '../../etc/passwd',
    });

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('traduce un upstream caído en 502 con código accionable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));

    const response = await relayStream(
      new Request('http://localhost/api/agent-rpc/stream/x', { method: 'POST', body: '{}' }),
      { path: 'stream/x' }
    );

    expect(response.status).toBe(502);
    const body = (await response.json()) as { ok: boolean; error: { code?: string } };
    expect(body.ok).toBe(false);
    expect(body.error.code).toBeDefined();
  });

  it('conserva el status no-200 del upstream en lugar de enmascarándolo', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('no existe', { status: 404 })));

    const response = await relayStream(
      new Request('http://localhost/api/agent-rpc/stream/otro', { method: 'POST', body: '{}' }),
      { path: 'stream/otro' }
    );
    expect(response.status).toBe(404);
  });
});
