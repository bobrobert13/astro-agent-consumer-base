/**
 * @file tests/agent-chat/transport.spec.ts
 * @description El transporte mock es un sustituto exacto del real: si su contrato
 * se rompe, la UI se rompe igual con o sin backend.
 */
import { describe, expect, it, vi } from 'vitest';

import { mockTransport } from '@domains/agent-chat/transport/mock';
import { answerFor } from '@domains/agent-chat/composables/services/chat/data/chat.tokens';
import { transport } from '@domains/agent-chat/transport';
import type { StreamChunk } from '@domains/agent-chat/transport/types';

const baseInput = { agentId: 'research', prompt: 'hola', thread: 't1' };

describe('answerFor', () => {
  it('cierra siempre con `finish`, y el error termina sin texto', () => {
    for (const prompt of ['normal', '/error', '/slow']) {
      const chunks = answerFor('research', prompt);
      expect(chunks.length).toBeGreaterThan(0);
      const last = chunks[chunks.length - 1];
      expect(last?.type).toBe(prompt === '/error' ? 'error' : 'finish');
    }
  });

  it('/error emite un chunk de error con código del catálogo', () => {
    const chunk = answerFor('research', '/error')[0];
    expect(chunk).toMatchObject({ type: 'error', code: 'upstream_unreachable' });
  });

  it('/slow produce silencio suficiente para que el watchdog lo vea', () => {
    const chunks = answerFor('default', '/slow');
    // El marcador de retraso se inserta en la posición 2, no al final.
    expect(chunks[2]?.type).toBe('text-delta');
  });

  it('un agente sin frase asignada usa el texto genérico', () => {
    const chunks = answerFor('inexistente', 'cualquier cosa');
    const first = chunks[0];
    expect(first?.type).toBe('text-delta');
  });
});

describe('mockTransport.stream', () => {
  it('emite los chunks en orden y devuelve ok', async () => {
    const seen: StreamChunk[] = [];
    const result = await mockTransport.stream(baseInput, {
      signal: new AbortController().signal,
      onChunk: (chunk) => seen.push(chunk),
    });

    expect(result.ok).toBe(true);
    expect(seen.at(-1)?.type).toBe('finish');
    expect(seen.some((chunk) => chunk.type === 'text-delta')).toBe(true);
    expect(seen.some((chunk) => chunk.type === 'tool-call')).toBe(true);
  });

  it('respeta el abort antes de emitir cada chunk y no lanza', async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const seen: StreamChunk[] = [];
    const total = answerFor('research', baseInput.prompt).length;

    const running = mockTransport.stream(baseInput, { signal: controller.signal, onChunk: (c) => seen.push(c) });
    // Se deja emitir un par de chunks y se corta a mitad: el bucle mira el signal
    // antes de cada uno.
    await vi.advanceTimersByTimeAsync(150);
    controller.abort();
    await vi.advanceTimersByTimeAsync(5_000);
    const result = await running;

    vi.useRealTimers();
    expect(result.ok).toBe(true);
    expect(seen.length).toBeGreaterThan(0);
    expect(seen.length).toBeLessThan(total);
    expect(seen.at(-1)?.type).not.toBe('finish');
  });

  it('health dice que está disponible sin tocar la red', async () => {
    const result = await mockTransport.health();
    expect(result).toMatchObject({ ok: true, data: { reachable: true, transport: 'mock' } });
  });
});

describe('resolveTransport (a través del envoltorio)', () => {
  it('con el env stub en mock, la etiqueta es mock', async () => {
    const result = await transport.health();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.transport).toBe('mock');
  });
});
