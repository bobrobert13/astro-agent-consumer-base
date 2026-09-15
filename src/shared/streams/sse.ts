/**
 * @file src/shared/streams/sse.ts
 * @description Utilidades de Server-Sent Events para los dos lados del relay.
 *
 * Lado servidor (`pipeVerbatim`, `relayHeaders`, `idleWatchdog`): reenvía el
 * stream **sin parsearlo**. Lado cliente (`readSseLines`): parsea frames cuando
 * no se usa el cliente del proveedor.
 *
 * La regla que hay que respetar al tocar este archivo: los streams nunca se
 * reescriben en el servidor. Re-encodear significaría reimplementar el contrato
 * de `@ai-sdk/ui-utils` (y su `[DONE]`, errores y reconexión) y hacer
 * `JSON.parse` + `stringify` por token en el proceso que sirve la UI.
 */

/** Cabeceras que NO deben reenviarse: son por-hop, no de contenido. */
const HOP_BY_HOP_HEADERS = [
  'connection',
  'keep-alive',
  'content-length',
  'transfer-encoding',
  'upgrade',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
];

/** Cabeceras que delatan el upstream o rompen el streaming intermedio. */
const STRIP_ADDITIONAL = ['set-cookie', 'date', 'server', 'via', 'content-encoding'];

/**
 * Cabeceras de respuesta para un reenvío.
 *
 * `x-accel-buffering: no` y `cache-control: no-cache` son los dos campos que
 * evitan que un proxy intermedio (o el propio Chromium) acumule el stream hasta
 * el final en vez de ir mostrándolo.
 *
 * `connection` NO se fija: es por-hop y lo gobierna el servidor Node. Reenviarlo
 * o inventarlo es la clase de cabecera que un proxy intermedio usa para cortar la
 * conexión larga.
 */
export function relayHeaders(upstream: Headers): Headers {
  const out = new Headers();

  // Primero se copia lo que el upstream sí quiere que se sepa...
  for (const [name, value] of upstream.entries()) {
    const lower = name.toLowerCase();
    if (HOP_BY_HOP_HEADERS.includes(lower) || STRIP_ADDITIONAL.includes(lower)) continue;
    out.set(name, value);
  }

  // ...y DESPUÉS se fijan las que manda del relay. En este orden es un detalle
  // funcional, no de estilo: si fuera al revés, un `cache-control: max-age=600`
  // del proveedor llegaría al navegador y el stream se acumularía en el proxy
  // en vez de ir mostrándose.
  const contentType = upstream.get('content-type') ?? 'text/event-stream';
  out.set('content-type', contentType);
  out.set('cache-control', 'no-cache, no-transform');
  out.set('x-accel-buffering', 'no');

  return out;
}

/**
 * Reenvío verbatim de un cuerpo binario, con abortos encadenables.
 *
 * No inspecciona el contenido: solo copia bytes. Devuelve el `Response` ya
 * listo para devolver desde un endpoint de Astro.
 */
export function pipeVerbatim(
  upstreamBody: ReadableStream<Uint8Array> | null,
  init: { status: number; headers: Headers }
): Response {
  if (upstreamBody === null) {
    return new Response('', { status: init.status, headers: init.headers });
  }
  return new Response(upstreamBody, { status: init.status, headers: init.headers });
}

/**
 * Vigilante de stream parado, medido **en bytes**.
 *
 * Es un `TransformStream` que cuenta longitudes y rearma un temporizador; no
 * abre los frames, para no violar la política de reenvío verbatim. Si pasa
 * `timeoutMs` sin un solo byte, aborta la señal que se le pase: así el upstream
 * se cierra sin dejar una lectura colgada ni un temporizador flotando.
 */
export function idleWatchdog(timeoutMs: number, onIdle: () => void): TransformStream<Uint8Array, Uint8Array> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const arm = (controller: TransformStreamDefaultController<Uint8Array>) => {
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(() => {
      controller.error(new DOMException('Idle stream timeout', 'TimeoutError'));
      onIdle();
    }, timeoutMs);
    // Que un stream sin tráfico no impida cerrar el proceso.
    timer.unref?.();
  };

  return new TransformStream<Uint8Array, Uint8Array>({
    start(controller) {
      arm(controller);
    },
    transform(chunk, controller) {
      arm(controller);
      controller.enqueue(chunk);
    },
    flush() {
      if (timer !== undefined) clearTimeout(timer);
    },
  });
}

/** Un frame de SSE ya troceado. */
export interface SseFrame {
  event: string;
  data: string;
  id?: string | undefined;
  retry?: number | undefined;
}

/**
 * Lectura de frames SSE desde el navegador (path sin cliente del proveedor).
 *
 * Implementa lo que la especificación manda para `data:` multi-línea y descarta
 * comentarios (`:`) y el campo `event:` vacío. Es el plan B del riesgo R1: si
 * `@mastra/client-js` se vuelve inservible, este iterator más un parser de la
 * carga útil implementa el mismo contrato de transporte sin cambiar la UI.
 */
export async function* readSseLines(
  body: ReadableStream<Uint8Array>,
  signal?: AbortSignal
): AsyncGenerator<SseFrame, void, undefined> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  signal?.addEventListener('abort', () => void reader.cancel().catch(() => undefined), { once: true });

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Un frame termina en doble salto de línea. Aceptar CRLF también.
      let boundary = buffer.indexOf('\n\n');
      let crlf = buffer.indexOf('\r\n\r\n');
      while (crlf !== -1 && (boundary === -1 || crlf < boundary)) {
        boundary = crlf;
        crlf = buffer.indexOf('\r\n\r\n', boundary + 2);
      }

      while (boundary !== -1) {
        const rawFrame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + (rawFrame.endsWith('\r') ? 4 : 2));
        const frame = parseFrame(rawFrame);
        if (frame !== undefined) yield frame;

        boundary = buffer.indexOf('\n\n');
        crlf = buffer.indexOf('\r\n\r\n');
        while (crlf !== -1 && (boundary === -1 || crlf < boundary)) {
          boundary = crlf;
          crlf = buffer.indexOf('\r\n\r\n', boundary + 2);
        }
      }
    }

    const tail = parseFrame(buffer);
    if (tail !== undefined) yield tail;
  } finally {
    reader.releaseLock();
  }
}

function parseFrame(raw: string): SseFrame | undefined {
  const lines = raw.split(/\r?\n/);
  let event = 'message';
  const data: string[] = [];
  let id: string | undefined;
  let retry: number | undefined;

  for (const line of lines) {
    if (line === '' || line.startsWith(':')) continue;
    const colon = line.indexOf(':');
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? '' : line.slice(colon + 1);
    if (value.startsWith(' ')) value = value.slice(1);

    if (field === 'data') data.push(value);
    else if (field === 'event') event = value;
    else if (field === 'id') id = value;
    else if (field === 'retry' && Number.isFinite(Number(value))) retry = Number(value);
  }

  if (data.length === 0) return undefined;
  return { event, data: data.join('\n'), ...(id !== undefined ? { id } : {}), ...(retry !== undefined ? { retry } : {}) };
}
