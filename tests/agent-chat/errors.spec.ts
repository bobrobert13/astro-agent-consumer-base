/**
 * @file tests/agent-chat/chat.e.spec.ts
 * @description Regla del repo: ningún código de error llega a la pantalla sin su
 * texto en español. Este test es el que la hace cumplible.
 */
import { describe, expect, it } from 'vitest';

import { CHAT_ERROR_CODES, chatErrorCodeFrom, relayErrorFrom, resolveChatErrorMessage } from '@domains/agent-chat/composables/services/chat/chat.e';
import { resolveStreamErrorText } from '@domains/agent-chat/ai/adapt-ui-messages';

describe('catálogo de errores', () => {
  it('cada código declarado tiene mensaje en español', () => {
    for (const [name, code] of Object.entries(CHAT_ERROR_CODES)) {
      const message = resolveChatErrorMessage({ statusCode: 500, code });
      expect(message, `falta el mensaje de ${name}`).not.toBe('');
      expect(message).not.toBe(code);
    }
  });

  it('ningún mensaje suena a stack trace', () => {
    for (const code of Object.values(CHAT_ERROR_CODES)) {
      const message = resolveChatErrorMessage({ statusCode: 500, code });
      expect(message).not.toMatch(/at .*\.ts|Error:|undefined/);
    }
  });

  it('sin código, degrada por estado HTTP', () => {
    expect(resolveChatErrorMessage({ statusCode: 404 })).toContain('no existe');
    expect(resolveChatErrorMessage({ statusCode: 429 })).toContain('demasiadas');
    expect(resolveChatErrorMessage({ statusCode: 502 })).toContain('backend');
    expect(resolveChatErrorMessage({ statusCode: 499 })).toContain('cancel');
  });

  it('un estado que el slice no sabe explicar respeta el mensaje del operador', () => {
    expect(resolveChatErrorMessage({ statusCode: 418, message: 'El agente está ocupado.' })).toBe(
      'El agente está ocupado.'
    );
  });

  it('un estado sin código ni mensaje no deja la pantalla en blanco', () => {
    expect(resolveChatErrorMessage({ statusCode: 418 })).toBe('Algo salió mal. Inténtalo de nuevo.');
  });
});

describe('chatErrorCodeFrom', () => {
  it('reconoce un código del catálogo', () => {
    expect(chatErrorCodeFrom('upstream_unreachable')).toBe(CHAT_ERROR_CODES.upstreamUnreachable);
    expect(chatErrorCodeFrom(CHAT_ERROR_CODES.aborted)).toBe(CHAT_ERROR_CODES.aborted);
  });

  it('cualquier otro texto no es un código', () => {
    expect(chatErrorCodeFrom('Processor workflow failed')).toBeUndefined();
    expect(chatErrorCodeFrom('')).toBeUndefined();
  });
});

describe('relayErrorFrom — el JSON de error del BFF, embebido en el texto del SDK', () => {
  it('abre el shape { ok:false, error:{ statusCode, code } }', () => {
    expect(
      relayErrorFrom('{"ok":false,"error":{"statusCode":502,"code":"connect_timeout"}}')
    ).toEqual({ statusCode: 502, code: 'connect_timeout' });
  });

  it('lo reconoce aunque venga envuelto en más texto', () => {
    expect(
      relayErrorFrom('Failed: {"ok":false,"error":{"statusCode":413,"code":"payload_too_large"}} (relay)')
    ).toEqual({ statusCode: 413, code: 'payload_too_large' });
  });

  it('un body ajeno ({"error":"…"} del backend, internos, texto vacío) no es un fallo del relay', () => {
    expect(relayErrorFrom('{"error":"Internal Server Error"}')).toBeUndefined();
    expect(relayErrorFrom('Processor workflow failed')).toBeUndefined();
    expect(relayErrorFrom('')).toBeUndefined();
  });
});

describe('resolveStreamErrorText con errores del relay', () => {
  it('un 502 connect_timeout del BFF deja de caer al mensaje genérico', () => {
    const error = new Error(
      '{"ok":false,"error":{"statusCode":502,"code":"upstream_unreachable","message":"connect_timeout"}}'
    );

    expect(resolveStreamErrorText(error)).toBe(
      resolveChatErrorMessage({ statusCode: 502, code: CHAT_ERROR_CODES.upstreamUnreachable })
    );
    expect(resolveStreamErrorText(error)).not.toContain('connect_timeout');
  });

  it('un 413 del relay explica el tamaño en vez del genérico', () => {
    const error = new Error('{"ok":false,"error":{"statusCode":413,"code":"payload_too_large"}}');
    expect(resolveStreamErrorText(error)).toContain('demasiado largo');
  });

  it('sin código, decide el estado HTTP que trae el APICallError (429 del backend)', () => {
    const error = Object.assign(new Error('{"error":"rate limit exceeded"}'), { statusCode: 429 });
    expect(resolveStreamErrorText(error)).toContain('demasiadas peticiones');
  });

  it('un 500 del backend sin código sigue siendo el genérico (nunca el JSON crudo)', () => {
    const error = Object.assign(new Error('{"error":"Internal Server Error"}'), { statusCode: 500 });
    const text = resolveStreamErrorText(error);

    expect(text).not.toContain('Internal Server Error');
    expect(text).toBe(resolveChatErrorMessage({ statusCode: 502, code: CHAT_ERROR_CODES.agentError }));
  });
});

describe('resolveStreamErrorText', () => {
  it('traduce el código que el transporte simulado emite como texto', () => {
    const error = new Error(CHAT_ERROR_CODES.upstreamUnreachable);
    expect(resolveStreamErrorText(error)).toBe(
      resolveChatErrorMessage({ statusCode: 502, code: CHAT_ERROR_CODES.upstreamUnreachable })
    );
  });

  it('un interno del proveedor NUNCA llega a la pantalla', () => {
    const text = resolveStreamErrorText(new Error('Processor workflow "guard" requires ANTHROPIC_API_KEY'));

    expect(text).not.toContain('Processor');
    expect(text).not.toContain('ANTHROPIC');
    expect(text).toBe(resolveChatErrorMessage({ statusCode: 502, code: CHAT_ERROR_CODES.agentError }));
  });
});
