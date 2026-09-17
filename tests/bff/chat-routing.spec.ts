/**
 * @file tests/bff/chat-routing.spec.ts
 * @description El destino del relay sale del CUERPO, y eso lo convierte en la
 * única puerta que un cliente puede intentar forzar. Aquí se fija lo que se acepta
 * y lo que se rechaza.
 */
import { describe, expect, it } from 'vitest';

import { agentIdSchema, chatUpstreamPath } from '@domains/agent-chat/server/normalize-agent-run';

const body = (agentId: unknown) => ({ agentId, messages: [{ id: 'm1', role: 'user', parts: [] }] });

describe('chatUpstreamPath', () => {
  it('construye la ruta de chat del upstream con el agente del cuerpo', () => {
    expect(chatUpstreamPath(body('research-agent'))).toBe('chat/research-agent');
  });

  it('rechaza un cuerpo sin agente', () => {
    expect(chatUpstreamPath({ messages: [{ id: 'm1', role: 'user', parts: [] }] })).toBeUndefined();
  });

  it('rechaza un cuerpo sin mensajes: no hay nada que ejecutar', () => {
    expect(chatUpstreamPath({ agentId: 'research-agent', messages: [] })).toBeUndefined();
  });

  it.each([['../admin'], ['a/b'], ['agents/../../etc'], ['con espacio'], ['']])(
    'rechaza el identificador %s, que no puede ser un id de agente',
    (agentId) => {
      expect(chatUpstreamPath(body(agentId))).toBeUndefined();
    }
  );

  it('rechaza un payload que ni siquiera es un objeto', () => {
    for (const payload of [null, undefined, 'texto', 42]) {
      expect(chatUpstreamPath(payload)).toBeUndefined();
    }
  });

  it('acepta los ids reales que registra el backend', () => {
    for (const agentId of ['research-agent', 'task-management-agent', 'file-operations-agent', 'communication-agent']) {
      expect(chatUpstreamPath(body(agentId))).toBe(`chat/${agentId}`);
    }
  });
});

describe('agentIdSchema', () => {
  it('pone techo a la longitud, porque el id se interpola en una ruta', () => {
    expect(agentIdSchema.safeParse('a'.repeat(96)).success).toBe(true);
    expect(agentIdSchema.safeParse('a'.repeat(97)).success).toBe(false);
  });
});
