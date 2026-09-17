import { AGENT_CONNECT_TIMEOUT, AGENT_IDLE_TIMEOUT } from '@shared/env/server';
import { idleWatchdog, relayHeaders } from '@shared/streams/sse';
import { reportError } from '@shared/observability/report-error';
import { upstreamHeaders, upstreamUrl, type UpstreamMount } from '@shared/server/upstream';
import { BodyTooLargeError } from './gateway';
import { bodyWithScope, readRelayBody, requestedThread, type RelayBody } from './relay-body';
import { resolveScope } from './session-scope';

/**
 * @file src/domains/agent-chat/server/stream-relay.ts
 * @description Reenvío del stream del agente **verbatim**.
 *
 * Copia bytes, nunca parsea la **respuesta**. Reescribir los frames significaría
 * reimplementar el protocolo de stream del AI SDK (sus partes, su `[DONE]`, su
 * reconexión) y hacer `JSON.parse` + `stringify` **por token** en el mismo proceso que
 * sirve la interfaz. El valor del BFF es otro: inyectar el
 * secreto, esconder el origen, imponer límites, propagar la cancelación y
 * observar. Todo eso se hace con cabeceras y timeouts, no con parsing.
 *
 * El **cuerpo de la petición** es otra cosa y sí se abre, en un único punto
 * acotado (`relay-body.ts`), por tres motivos que no admiten otra vía: el límite de
 * tamaño, la identidad de memoria —que no puede decidirla el navegador— y el destino
 * del reenvío, que también sale de él. La respuesta sigue saliendo byte a byte por el
 * mismo camino de antes.
 *
 * Cadena de aborto, en un solo sentido y sin temporizadores flotantes:
 *
 *   isla se desmonta → `controller.abort()` en el navegador
 *     → `request.signal` aborta en Astro
 *       → `AbortSignal.any([request.signal, upstreamAbort.signal])` en el fetch
 *         → el upstream cierra su ejecución
 */

/**
 * Re-exportado para que el barrel del slice no tenga que saber de dónde sale: es
 * el mismo `mount` que usan los constructores de URL de `shared/server/upstream`.
 */
export type { UpstreamMount };

export interface RelayOptions {
  /** Ruta relativa al upstream, conocida antes de leer el cuerpo. */
  path?: string;
  /**
   * Destino calculado **desde el cuerpo**. Existe porque el agente de una
   * ejecución de chat viaja dentro del body —el transporte del cliente es uno
   * solo y estable— y el cuerpo solo se puede leer una vez: resolverlo aquí evita
   * abrirlo dos veces. Devolver `undefined` ⇒ 400.
   */
  routeFromBody?: (payload: unknown) => string | undefined;
  /** Por defecto `'api'`. */
  mount?: UpstreamMount;
}

/** Cabeceras de petición que sí se reenvían. Allowlist, no lista negra. */
const FORWARDED_REQUEST_HEADERS = ['content-type', 'accept', 'accept-language'] as const;

export async function relayStream(request: Request, options: RelayOptions): Promise<Response> {
  // El cuerpo se prepara ANTES de resolver el destino y el scope, y en este orden
  // por dos motivos: el hilo con el que el cliente quiere hablar viaja dentro (hay
  // que sanearlo), y cuando el destino depende del cuerpo —el agente de una
  // ejecución de chat— esa lectura es la única posible, porque un `Request` no se
  // puede leer dos veces.
  let relayBody: RelayBody;
  try {
    relayBody = await readRelayBody(request);
  } catch (error) {
    if (error instanceof BodyTooLargeError) {
      return errorResponse(413, 'payload_too_large', `El mensaje supera el límite de ${error.maxBytes} bytes.`);
    }
    throw error;
  }

  const payload = relayBody.mode === 'json' ? relayBody.parsed : undefined;

  const relativePath = sanitizePath(options.routeFromBody?.(payload) ?? options.path ?? '');
  if (relativePath === undefined) {
    return errorResponse(400, 'invalid_path', 'La ruta del relay no es válida.');
  }

  const scope = resolveScope(request, requestedThread(payload));

  const target = upstreamUrl(relativePath, options.mount);
  const upstreamAbort = new AbortController();
  const headers = upstreamHeaders(pickRequestHeaders(request));

  // El timeout de conexión solo cubre hasta que llegan las cabeceras: un
  // `AbortSignal.timeout()` a secas mataría el stream a los N segundos de estar
  // funcionando bien.
  const connectTimer = setTimeout(() => upstreamAbort.abort(new Error('connect_timeout')), AGENT_CONNECT_TIMEOUT);
  connectTimer.unref?.();

  let upstream: Response;
  const requestBody = bodyWithScope(relayBody, scope);
  // `duplex` no está en el `RequestInit` del lib DOM que trae Astro, pero undici
  // lo exige: sin él, reenviar un cuerpo en streaming falla con "duplex option is
  // required" y TODO stream real devuelve 502, mientras los tests con `fetch`
  // simulado siguen en verde. Solo hace falta con cuerpos que se reenvían como
  // stream (`opaque`); un JSON acotado ya se leyó y viaja como texto.
  const init: RequestInit & { duplex?: 'half' } = {
    method: request.method,
    headers,
    signal: AbortSignal.any([request.signal, upstreamAbort.signal]),
  };
  if (requestBody !== null) {
    init.body = requestBody;
    if (requestBody instanceof ReadableStream) init.duplex = 'half';
  }

  try {
    // Si el cliente ya se fue (abortó mientras se preparaba el cuerpo), no se
    // abre conexión con el upstream: se responde 499 y el backend no se entera.
    // Con el cuerpo leído en un paso previo esto dejó de ser teórico: hay un
    // `await` antes del fetch, así que la ventana existe de verdad.
    if (request.signal.aborted) {
      clearTimeout(connectTimer);
      return errorResponse(499, 'aborted', 'Operación cancelada.');
    }
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
  // La identidad de memoria se acuña aquí y se fija en el navegador. Se añade
  // SIEMPRE que falte la cookie, no solo en las peticiones de ejecución: si el
  // primer contacto con el BFF es un GET de catálogo, ese navegador queda con la
  // misma identidad que usará luego para conversar.
  if (scope.setCookie !== undefined) outHeaders.append('set-cookie', scope.setCookie);

  if (!upstream.body) {
    return new Response(null, { status: upstream.status, headers: outHeaders });
  }

  const watchdog = idleWatchdog(AGENT_IDLE_TIMEOUT, () => upstreamAbort.abort(new Error('idle_timeout')));
  const relayed = upstream.body.pipeThrough(watchdog);

  return new Response(relayed, { status: upstream.status, headers: outHeaders });
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
