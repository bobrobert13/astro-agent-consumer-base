/**
 * @file tests/shared/streams.spec.ts
 * @description Las piezas del kernel que sostienen el relay: `sse` (cabeceras de
 * reenvío, frames entrantes y vigilante de stream parado).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { idleWatchdog, readSseLines, relayHeaders } from '@shared/streams/sse';

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
