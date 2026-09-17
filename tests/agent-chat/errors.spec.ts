/**
 * @file tests/agent-chat/chat.e.spec.ts
 * @description Regla del repo: ningún código de error llega a la pantalla sin su
 * texto en español. Este test es el que la hace cumplible.
 */
import { describe, expect, it } from 'vitest';

import { CHAT_ERROR_CODES, chatErrorCodeFrom, resolveChatErrorMessage } from '@domains/agent-chat/composables/services/chat/chat.e';
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
