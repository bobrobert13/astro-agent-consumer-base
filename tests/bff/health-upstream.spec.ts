/**
 * @file tests/bff/health-upstream.spec.ts
 * @description La sonda de salud del camino BFF → backend.
 *
 * Comprueba las dos cosas que se pueden romper en silencio: que pregunte a la ruta
 * correcta —las rutas custom de Mastra cuelgan de la raíz, no de `/api`— y que no
 * filtre al navegador ni el host ni el texto de error del upstream.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { upstreamUrl } from '@shared/server/upstream';
import { upstreamHealth } from '@shared/server/upstream-health';

function stubFetch(respond: () => Promise<Response>): ReturnType<typeof vi.fn> {
  const mock = vi.fn(respond);
  vi.stubGlobal('fetch', mock);
  return mock;
}

describe('upstreamHealth', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('pregunta a la ruta de versión, que cuelga de la raíz del backend', async () => {
    const fetchMock = stubFetch(async () => Response.json({ status: 'ok', version: '1.2.3' }));

    await upstreamHealth();

    expect(String(fetchMock.mock.calls[0]?.[0])).toBe('http://localhost:4111/health/version');
  });

  it('reporta alcanzable con la versión y el entorno', async () => {
    stubFetch(async () => Response.json({ status: 'ok', version: '1.2.3', env: 'production' }));

    await expect(upstreamHealth()).resolves.toEqual({ reachable: true, version: '1.2.3', env: 'production' });
  });

  it('no inventa una versión que el backend no declaró', async () => {
    stubFetch(async () => Response.json({ status: 'ok' }));

    await expect(upstreamHealth()).resolves.toEqual({ reachable: true });
  });

  it('un backend caído es `reachable: false`, no una excepción', async () => {
    stubFetch(async () => {
      throw new TypeError('fetch failed');
    });

    await expect(upstreamHealth()).resolves.toEqual({ reachable: false });
  });

  it('un backend que contesta error tampoco filtra su texto', async () => {
    stubFetch(async () => new Response('stack interno del backend', { status: 500 }));

    await expect(upstreamHealth()).resolves.toEqual({ reachable: false });
  });
});

describe('upstreamUrl', () => {
  it('monta en /api por defecto y en la raíz cuando se le pide', () => {
    expect(upstreamUrl('agents').toString()).toBe('http://localhost:4111/api/agents');
    expect(upstreamUrl('/chat/research', 'root').toString()).toBe('http://localhost:4111/chat/research');
  });
});
