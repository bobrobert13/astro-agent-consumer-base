import { AGENT_CONNECT_TIMEOUT, AGENT_IDLE_TIMEOUT } from '@shared/env/server';
import { idleWatchdog, relayHeaders } from '@shared/streams/sse';
import { reportError } from '@shared/observability/report-error';
import { upstreamHeaders, upstreamUrl } from '@shared/server/upstream';

/**
 * @file src/domains/agent-chat/server/stream-relay.ts
 * @description Reenvío del stream del agente **verbatim**.
 *
 * Copia bytes, nunca parsea. Reescribir los frames significaría reimplementar el
 * contrato de wire format del SDK (`processDataStream`, su `[DONE]`, su
 * reconexión) y hacer `JSON.parse` + `stringify` **por token** en el mismo
 * proceso que sirve la interfaz. El valor del BFF es otro: inyectar el secreto,
 * esconder el origen, imponer límites, propagar la cancelación y observar. Todo
 * eso se hace con cabeceras y timeouts, no con parsing.
 *
 * Cadena de aborto, en un solo sentido y sin temporizadores flotantes:
 *
 *   isla se desmonta → `controller.abort()` en el navegador
 *     → `request.signal` aborta en Astro
 *       → `AbortSignal.any([request.signal, upstreamAbort.signal])` en el fetch
 *         → el upstream cierra su ejecución
 */
export interface RelayOptions {
  /** Ruta relativa al API del upstream, p. ej. `stream/research`. */
  path: string;
}

/** Cabeceras de petición que sí se reenvían. Allowlist, no lista negra. */
const FORWARDED_REQUEST_HEADERS = ['content-type', 'accept', 'accept-language'] as const;

export async function relayStream(request: Request, options: RelayOptions): Promise<Response> {
  const relativePath = sanitizePath(options.path);
  if (relativePath === undefined) {
    return errorResponse(400, 'invalid_path', 'La ruta del relay no es válida.');
  }

  const target = upstreamUrl(relativePath);
  const upstreamAbort = new AbortController();
  const headers = upstreamHeaders(pickRequestHeaders(request));

  // El timeout de conexión solo cubre hasta que llegan las cabeceras: un
  // `AbortSignal.timeout()` a secas mataría el stream a los N segundos de estar
  // funcionando bien.
  const connectTimer = setTimeout(() => upstreamAbort.abort(new Error('connect_timeout')), AGENT_CONNECT_TIMEOUT);
  connectTimer.unref?.();

  let upstream: Response;
  const requestBody = bodyFor(request);
  // `duplex` no está en el `RequestInit` del lib DOM que trae Astro, pero undici
  // lo exige: sin él, reenviar un cuerpo en streaming falla con "duplex option is
  // required" y TODO stream real devuelve 502, mientras los tests con `fetch`
  // simulado siguen en verde.
  const init: RequestInit & { duplex?: 'half' } = {
    method: request.method,
    headers,
    signal: AbortSignal.any([request.signal, upstreamAbort.signal]),
  };
  if (requestBody !== null) {
    init.body = requestBody;
    init.duplex = 'half';
  }

  try {
    upstream = await fetch(target, init);
  } catch (error) {
    clearTimeout(connectTimer);
    const reported = reportError(error, { scope: 'bff/relay', tags: { path: relativePath } });
    // Un abort del propio cliente no es un fallo: se responde 499 y ya.
    if (request.signal.aborted) return errorResponse(499, 'aborted', 'Operación cancelada.');
    return errorResponse(502, reported.code ?? 'upstream_unreachable', reported.message);
  }

  clearTimeout(connectTimer);

  const outHeaders = relayHeaders(upstream.headers);
  if (!upstream.body) {
    return new Response(null, { status: upstream.status, headers: outHeaders });
  }

  const watchdog = idleWatchdog(AGENT_IDLE_TIMEOUT, () => upstreamAbort.abort(new Error('idle_timeout')));
  const relayed = upstream.body.pipeThrough(watchdog);

  return new Response(relayed, { status: upstream.status, headers: outHeaders });
}

/**
 * El cuerpo se reenvía como stream, no se recrea: para un POST de JSON pequeño
 * da igual, pero mantiene el relay agnóstico del tamaño y del content-type.
 */
function bodyFor(request: Request): BodyInit | null {
  if (request.method === 'GET' || request.method === 'HEAD') return null;
  return request.body;
}

function pickRequestHeaders(request: Request): Headers {
  const out = new Headers();
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value !== null) out.set(name, value);
  }
  return out;
}

/**
 * Rechaza cualquier intento de escapar del prefijo `/api` del upstream.
 * El `[...path]` de Astro ya viene recortado, pero el relay no lo asume.
 */
function sanitizePath(raw: string): string | undefined {
  const clean = raw.replace(/^\/+/, '');
  if (clean === '') return undefined;
  const segments = clean.split('/');
  if (segments.some((segment) => segment === '' || segment === '.' || segment === '..')) return undefined;
  return clean;
}

function errorResponse(status: number, code: string, message: string | undefined): Response {
  return Response.json({ ok: false, error: { statusCode: status, code, message } }, { status });
}
