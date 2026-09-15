/**
 * @file tests/shared/domain-events.spec.ts
 * @description El bus solo transporta señales momentáneas entre slices. Lo que se
 * prueba aquí es sobre todo el cierre de suscripción, porque una isla que se
 * desmonta sin cerrar su listener es una fuga que se paga en cada navegación.
 */
import { describe, expect, it, vi } from 'vitest';

import { emitDomainEvent, onDomainEvent } from '@shared/bus/domain-events';

describe('domain-events', () => {
  it('entrega el payload tipado al suscriptor', () => {
    const handler = vi.fn();
    const off = onDomainEvent('agent:run-finished', handler);

    emitDomainEvent('agent:run-finished', { agentId: 'research', threadId: 't1', ok: true });
    expect(handler).toHaveBeenCalledWith({ agentId: 'research', threadId: 't1', ok: true });

    off();
  });

  it('la función devuelta cierra la suscripción', () => {
    const handler = vi.fn();
    onDomainEvent('session:deleted', handler)();

    emitDomainEvent('session:deleted', { threadId: 't2' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('varias suscripciones del mismo evento conviven', () => {
    const first = vi.fn();
    const second = vi.fn();
    const offFirst = onDomainEvent('toast:show', first);
    const offSecond = onDomainEvent('toast:show', second);

    emitDomainEvent('toast:show', { message: 'listo' });
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);

    offFirst();
    offSecond();
  });

  it('cierra una suscripción sin afectar a las demás', () => {
    const kept = vi.fn();
    const offFirst = onDomainEvent('agent:run-started', vi.fn());
    const offKept = onDomainEvent('agent:run-started', kept);

    offFirst();
    emitDomainEvent('agent:run-started', { agentId: 'tasks', threadId: 't3' });
    expect(kept).toHaveBeenCalledTimes(1);

    offKept();
  });
});
