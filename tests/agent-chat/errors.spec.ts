/**
 * @file tests/agent-chat/chat.e.spec.ts
 * @description Regla del repo: ningún código de error llega a la pantalla sin su
 * texto en español. Este test es el que la hace cumplible.
 */
import { describe, expect, it } from 'vitest';

import { CHAT_ERROR_CODES, resolveChatErrorMessage } from '@domains/agent-chat/composables/services/chat/chat.e';
import { translateChunk } from '@domains/agent-chat/transport/mastra';

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

describe('translateChunk', () => {
  it('trae los tipos que el dominio entiende', () => {
    expect(translateChunk({ type: 'text-delta', payload: { text: 'hola' } })).toEqual({ type: 'text-delta', text: 'hola' });
    expect(translateChunk({ type: 'text-end' })).toEqual({ type: 'text-end' });
    expect(translateChunk({ type: 'tool-call', payload: { toolName: 'buscar', args: { q: 1 } } })).toEqual({
      type: 'tool-call',
      toolName: 'buscar',
      args: { q: 1 },
    });
    expect(translateChunk({ type: 'error', payload: { message: 'mal' } })).toEqual({ type: 'error', message: 'mal' });
  });

  it('ignora explícitamente los tipos del stream real que no mapean al dominio', () => {
    for (const type of ['start', 'start-step', 'step-start', 'step-finish', 'data-om-status', 'message-metadata']) {
      expect(translateChunk({ type })).toBeUndefined();
    }
  });

  it('lee la forma real del frame error de Mastra 1.29 (payload.error.message)', () => {
    // Capturada contra el backend en marcha: el mensaje vive anidado, no en
    // `payload.message`.
    expect(
      translateChunk({ type: 'error', payload: { error: { message: 'Processor workflow failed' } } })
    ).toEqual({ type: 'error', message: 'Processor workflow failed' });
  });

  it('un texto ausente no rompe el chunk: llega cadena vacía', () => {
    expect(translateChunk({ type: 'text-delta' })).toEqual({ type: 'text-delta', text: '' });
  });

  it('una herramienta sin nombre recibe uno presentable', () => {
    expect(translateChunk({ type: 'tool-call', payload: {} })).toMatchObject({ toolName: 'herramienta' });
  });
});
