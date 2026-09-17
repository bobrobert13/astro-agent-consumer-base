/**
 * @file tests/bff/session-scope.spec.ts
 * @description La identidad de memoria que decide el servidor.
 *
 * El caso que motivó este archivo: dos navegadores mandaban el hilo `nuevo` —la
 * entrada a "conversación nueva"— y el backend rechazaba al segundo con `Thread
 * "nuevo" belongs to resource … but … was provided`, porque un hilo pertenece al
 * resource que lo creó. El marcador tiene que acotarse aquí: es identidad de
 * memoria, y eso no lo decide el navegador.
 */
import { describe, expect, it } from 'vitest';

import { resolveScope } from '@domains/agent-chat/server/session-scope';

const request = (resource?: string) =>
  new Request('http://localhost/api/agent-chat', {
    method: 'POST',
    ...(resource !== undefined ? { headers: { cookie: `aac_resource=${resource}` } } : {}),
  });

describe('resolveScope — el marcador de hilo nuevo', () => {
  it('lo acota al resource, para que dos navegadores no compartan hilo', () => {
    const uno = resolveScope(request('aaaa'), 'nuevo');
    const otro = resolveScope(request('bbbb'), 'nuevo');

    expect(uno.thread).toBe('nuevo-aaaa');
    expect(otro.thread).toBe('nuevo-bbbb');
    expect(uno.thread).not.toBe(otro.thread);
  });

  it('el mismo navegador mantiene el mismo hilo entre mensajes', () => {
    // Si cambiara en cada envío, el agente no recordaría lo dicho un turno antes.
    const primero = resolveScope(request('aaaa'), 'nuevo');
    const segundo = resolveScope(request('aaaa'), 'nuevo');

    expect(primero.thread).toBe(segundo.thread);
  });

  it('un hilo de verdad se respeta tal cual', () => {
    expect(resolveScope(request('aaaa'), 'hilo-123').thread).toBe('hilo-123');
  });

  it('sigue saneando lo que llega por la URL', () => {
    expect(resolveScope(request('aaaa'), '../evil').thread).toBe('evil');
  });

  it('acuña identidad si falta la cookie, y no la repite si ya está', () => {
    const recien = resolveScope(request(), 'nuevo');

    expect(recien.setCookie).toContain('aac_resource=');
    // El hilo del navegador nuevo se acota al resource que se acaba de acuñar.
    expect(recien.thread).toBe(`nuevo-${recien.resource}`);
    expect(resolveScope(request('aaaa'), 'nuevo').setCookie).toBeUndefined();
  });
});
