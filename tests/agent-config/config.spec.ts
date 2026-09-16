/**
 * @file tests/agent-config/config.spec.ts
 * @description El contrato del formulario de configuración, incluido el test que
 * `src/domains/agent-config/AGENTS.md` exigía al completarse el slice: los values
 * por defecto del cliente y del BFF tienen que ser los mismos. Si divergen, la
 * pantalla muestra un número que el servidor no va a usar.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { agentConfigSchema } from '@domains/agent-chat/server';
import { readAgentConfig, writeAgentConfig } from '@domains/agent-config/composables/services/config/config.api';
import { CONFIG_ERROR_CODES, resolveConfigErrorMessage } from '@domains/agent-config/composables/services/config/config.e';
import { configEndpoints } from '@domains/agent-config/composables/services/config/config.endpoints';
import { DEFAULT_AGENT_SETTINGS } from '@domains/agent-config/types/agent-config.types';
import { useAgentConfig } from '@domains/agent-config/composables/useAgentConfig';

afterEach(() => vi.unstubAllGlobals());

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json' },
    ...init,
  });
}

describe('configEndpoints', () => {
  it('codifica el id del agente', () => {
    expect(configEndpoints.forAgent('research-agent')).toBe('/api/agents/research-agent/config');
    expect(configEndpoints.forAgent('a/b')).toBe('/api/agents/a%2Fb/config');
  });
});

describe('defaults: cliente contra BFF', () => {
  it('son exactamente los que valida el schema del servidor', () => {
    expect(DEFAULT_AGENT_SETTINGS).toEqual(agentConfigSchema.parse({}));
  });

  it('el schema rechaza una temperatura fuera de rango', () => {
    expect(agentConfigSchema.safeParse({ temperature: 3 }).success).toBe(false);
    expect(agentConfigSchema.safeParse({ temperature: 2 }).success).toBe(true);
  });
});

describe('readAgentConfig', () => {
  it('desenvuelve `{ ok, data }` del BFF', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      jsonResponse({ ok: true, data: { model: 'gpt', temperature: 0.2, memoryEnabled: false } })
    ));

    await expect(readAgentConfig('research-agent')).resolves.toEqual({
      ok: true,
      data: { model: 'gpt', temperature: 0.2, memoryEnabled: false },
    });
  });

  it('respeta el statusCode del error anidado en vez de inventar un 500', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      jsonResponse({ ok: false, error: { statusCode: 404, code: 'agent_not_found', message: 'no existe' } }, { status: 404 })
    ));

    const result = await readAgentConfig('fantasma');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.statusCode).toBe(404);
      expect(result.error.code).toBe('agent_not_found');
    }
  });

  it('un fallo de red se reporta con el código del slice', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));

    const result = await readAgentConfig('research-agent');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe(CONFIG_ERROR_CODES.loadFailed);
  });
});

describe('writeAgentConfig', () => {
  it('devuelve el eco validado del servidor, no lo que se envió', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      jsonResponse({ ok: true, data: { model: 'gpt', temperature: 1, memoryEnabled: true } })
    ));

    const result = await writeAgentConfig('research-agent', { model: 'gpt', temperature: 1.9, memoryEnabled: true });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.temperature).toBe(1);
  });

  it('un 400 con `field` llega intacto al formulario', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      jsonResponse(
        { ok: false, error: { statusCode: 400, code: 'invalid_request', message: 'demasiado alta', field: 'temperature' } },
        { status: 400 }
      )
    ));

    const result = await writeAgentConfig('research-agent', { model: '', temperature: 9, memoryEnabled: true });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.field).toBe('temperature');
      expect(resolveConfigErrorMessage(result.error)).toContain('válido');
    }
  });
});

describe('catálogo de errores del slice', () => {
  it('todo código tiene mensaje en español', () => {
    for (const [name, code] of Object.entries(CONFIG_ERROR_CODES)) {
      const message = resolveConfigErrorMessage({ statusCode: 500, code });
      expect(message, name).not.toBe('');
      expect(message).not.toBe(code);
    }
  });
});

describe('useAgentConfig', () => {
  it('no deja guardar sobre defaults que no se leyeron', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));
    const config = useAgentConfig();

    await config.load('research-agent');

    expect(config.state.value).toBe('error');
    expect(config.canSave.value).toBe(false);
    expect(config.settings.value).toEqual(DEFAULT_AGENT_SETTINGS);
    expect(config.message.value).toContain('No se pudo leer');
  });

  it('marca dirty solo contra lo que confirmó el servidor', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      jsonResponse({ ok: true, data: { model: '', temperature: 0.7, memoryEnabled: true } })
    ));
    const config = useAgentConfig();

    await config.load('research-agent');
    expect(config.dirty.value).toBe(false);

    config.temperature.value = 1.2;
    expect(config.dirty.value).toBe(true);

    config.revert();
    expect(config.temperature.value).toBe(0.7);
    expect(config.dirty.value).toBe(false);
  });

  it('rechazar no borra los valores cargados', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      jsonResponse({ ok: true, data: { model: 'gpt', temperature: 0.4, memoryEnabled: false } })
    ));
    const config = useAgentConfig();
    await config.load('research-agent');

    config.model.value = 'otro';
    config.revert();

    expect(config.settings.value.model).toBe('gpt');
  });
});
