/**
 * @file tests/shared/http.spec.ts
 * @description `createEndpoints`/`query` definen las claves de caché y el shape
 * de cada llamada; `requestJson` es la única puerta al BFF. Ambos son puro Node.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { requestJson, httpGet, httpPost } from '@shared/http/http-client';
import { createEndpoints, query } from '@shared/http/endpoints';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createEndpoints', () => {
  it('normaliza las barras entre prefijo y ruta', () => {
    const endpoints = createEndpoints('/api/agents');
    expect(endpoints.url('/research')).toBe('/api/agents/research');
    expect(endpoints.url('research')).toBe('/api/agents/research');
    expect(endpoints.url('')).toBe('/api/agents');
  });

  it('no duplica la barra si el prefijo ya la traía', () => {
    expect(createEndpoints('/api/agents/').url('x')).toBe('/api/agents/x');
  });
});

describe('query', () => {
  it('omite vacíos en lugar de mandar claves huecas', () => {
    expect(query({ q: '', page: 2, enabled: false, missing: null })).toBe('?page=2&enabled=false');
  });

  it('devuelve cadena vacía si no queda ningún parámetro', () => {
    expect(query({ a: undefined, b: null })).toBe('');
  });
});

describe('requestJson', () => {
  it('devuelve los datos parseados en `data`', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ hello: 'mundo' }), {
          headers: { 'content-type': 'application/json' },
        })
      )
    );

    const result = await httpGet<{ hello: string }>('/api/agents');
    expect(result).toEqual({ ok: true, data: { hello: 'mundo' } });
  });

  it('no pone content-type cuando no hay cuerpo', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}'));
    vi.stubGlobal('fetch', fetchMock);

    await requestJson('/api/x');
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(init.headers).toEqual({});
  });

  it('sí declara JSON cuando manda cuerpo', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}'));
    vi.stubGlobal('fetch', fetchMock);

    await httpPost('/api/x', { a: 1 });
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(init.headers).toMatchObject({ 'content-type': 'application/json' });
    expect(init.body).toBe('{"a":1}');
  });

  it('convierte un 404 con JSON del BFF en un ServiceError accionable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ status: 404, code: 'agent_not_found', message: 'no existe' }), {
          status: 404,
        })
      )
    );

    const result = await httpGet('/api/agents/nada');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatchObject({ statusCode: 404, code: 'agent_not_found' });
    }
  });

  it('sobrevive a un error que no es JSON (proxy, página de mantenimiento)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>502</html>', { status: 502 })));

    const result = await httpGet('/api/agents');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.statusCode).toBe(502);
  });

  it('no lanza nunca: un fallo de red vuelve como Result', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));

    await expect(httpGet('/api/agents')).resolves.toMatchObject({ ok: false });
  });

  it('trata el 204 como éxito sin cuerpo', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    await expect(httpPost('/api/x')).resolves.toEqual({ ok: true, data: undefined });
  });
});
