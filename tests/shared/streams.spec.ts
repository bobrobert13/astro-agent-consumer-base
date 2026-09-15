/**
 * @file tests/shared/streams.spec.ts
 * @description Las dos piezas que sostienen el rendimiento del streaming:
 * `token-batcher` (una entrega por frame, no por token) y `sse` (cabeceras de
 * reenvío, frames entrantes y vigilante de stream parado).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createTokenBatcher } from '@shared/streams/token-batcher';
import { idleWatchdog, readSseLines, relayHeaders } from '@shared/streams/sse';

describe('createTokenBatcher', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('agrupa 40 deltas en una sola entrega por frame', () => {
    const onFlush = vi.fn();
    const batcher = createTokenBatcher({ onFlush, schedule: (cb) => {
      const id = setTimeout(cb, 16);
      return () => clearTimeout(id);
    } });

    for (let i = 0; i < 40; i += 1) batcher.push('tok');
    expect(onFlush).not.toHaveBeenCalled();

    vi.advanceTimersByTime(20);
    expect(onFlush).toHaveBeenCalledTimes(1);
    expect(onFlush).toHaveBeenCalledWith('tok'.repeat(40));
  });

  it('vuelve a programar después de entregar', () => {
    const onFlush = vi.fn();
    const batcher = createTokenBatcher({ onFlush, schedule: (cb) => {
      const id = setTimeout(cb, 16);
      return () => clearTimeout(id);
    } });

    batcher.push('a');
    vi.advanceTimersByTime(20);
    batcher.push('b');
    vi.advanceTimersByTime(20);

    expect(onFlush.mock.calls).toEqual([['a'], ['b']]);
  });

  it('`flush` entrega de inmediato y vacía el búfer', () => {
    const onFlush = vi.fn();
    const batcher = createTokenBatcher({ onFlush, schedule: () => () => undefined });

    batcher.push('hola ');
    batcher.push('mundo');
    expect(batcher.pending()).toBe('hola mundo');
    expect(batcher.flush()).toBe('hola mundo');
    expect(batcher.pending()).toBe('');
    expect(onFlush).toHaveBeenCalledWith('hola mundo');
  });

  it('no entrega nada si no llegó ningún delta', () => {
    const onFlush = vi.fn();
    const batcher = createTokenBatcher({ onFlush, schedule: (cb) => {
      const id = setTimeout(cb, 16);
      return () => clearTimeout(id);
    } });

    batcher.destroy();
    vi.advanceTimersByTime(50);
    expect(onFlush).not.toHaveBeenCalled();
  });

  it('`destroy` cancela la entrega programada', () => {
    const onFlush = vi.fn();
    const batcher = createTokenBatcher({ onFlush, schedule: (cb) => {
      const id = setTimeout(cb, 16);
      return () => clearTimeout(id);
    } });

    batcher.push('x');
    batcher.destroy();
    vi.advanceTimersByTime(50);
    expect(onFlush).not.toHaveBeenCalled();
  });
});

describe('relayHeaders', () => {
  it('elimina las cabeceras por-hop y las que delatan el upstream', () => {
    const upstream = new Headers({
      'content-type': 'text/event-stream',
      connection: 'keep-alive',
      'transfer-encoding': 'chunked',
      'set-cookie': 'session=secreto',
      date: 'ayer',
      server: 'mastra/1.67',
      'x-trazable': 'sí',
    });

    const out = relayHeaders(upstream);

    expect(out.get('content-type')).toBe('text/event-stream');
    expect(out.get('x-trazable')).toBe('sí');
    for (const banned of ['connection', 'transfer-encoding', 'set-cookie', 'date', 'server']) {
      expect(out.get(banned), banned).toBeNull();
    }
  });

  it('fuerza no-cache y no-transform, y desactiva el buffering de proxies', () => {
    const out = relayHeaders(new Headers());
    expect(out.get('cache-control')).toContain('no-transform');
    expect(out.get('x-accel-buffering')).toBe('no');
  });
});

function streamOf(...chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

async function collect(body: ReadableStream<Uint8Array>): Promise<string[]> {
  const frames = [];
  for await (const frame of readSseLines(body)) frames.push(frame.data);
  return frames;
}

describe('readSseLines', () => {
  it('lee frames separados por doble salto de línea', async () => {
    expect(await collect(streamOf('data: uno\n\ndata: dos\n\n'))).toEqual(['uno', 'dos']);
  });

  it('une los `data:` multi-línea de un mismo frame', async () => {
    expect(await collect(streamOf('data: a\ndata: b\n\n'))).toEqual(['a\nb']);
  });

  it('tolera CRLF y un frame partido entre dos lecturas', async () => {
    expect(await collect(streamOf('data: par', 'cial\r\n\r\n'))).toEqual(['parcial']);
  });

  it('descarta comentarios y frames sin data', async () => {
    expect(await collect(streamOf(': ping\n\nevent: x\n\ndata: vale\n\n'))).toEqual(['vale']);
  });

  it('conserva el nombre del evento', async () => {
    const frames = [];
    for await (const frame of readSseLines(streamOf('event: finished\ndata: ok\n\n'))) {
      frames.push(frame);
    }
    expect(frames[0]).toMatchObject({ event: 'finished', data: 'ok' });
  });

  it('entrega el frame final aunque no cierre con doble salto', async () => {
    expect(await collect(streamOf('data: cola'))).toEqual(['cola']);
  });
});

describe('idleWatchdog', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('deja pasar los bytes sin modificarlos', async () => {
    const onIdle = vi.fn();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('hola'));
        controller.close();
      },
    }).pipeThrough(idleWatchdog(1_000, onIdle));

    const text = await new Response(stream).text();
    expect(text).toBe('hola');
    expect(onIdle).not.toHaveBeenCalled();
  });

  it('aborta la lectura si pasa el tiempo sin un solo byte', async () => {
    const onIdle = vi.fn();
    // Se ejercita el transform directamente: `pipeThrough` dejaría una promesa
    // de pipe interna rechazando sin dueño, y Vitest la contaría como ruido.
    const watchdog = idleWatchdog(100, onIdle);
    const reader = watchdog.readable.getReader();

    // La aserción se engancha ANTES de mover el reloj: si no, el rechazo nace sin
    // dueño y Vitest lo reporta como un unhandled rejection del proceso.
    const rejected = expect(reader.read()).rejects.toThrow();
    await vi.advanceTimersByTimeAsync(150);

    await rejected;
    expect(onIdle).toHaveBeenCalledTimes(1);
  });
});
