import { reportError } from '@shared/observability/report-error';

/**
 * @file src/domains/agent-chat/server/gateway.ts
 * @description Envoltorio explícito para todo handler del BFF.
 *
 * Existe en lugar de un `src/middleware.ts` por un motivo concreto de Astro 7:
 * el middleware corre sobre **todas** las rutas y su encadenamiento con un
 * endpoint que devuelve un `ReadableStream` añade un punto de fallo silencioso
 * (cierre prematuro del cuerpo, buffering). Un wrapper en la firma del handler
 * deja el comportamiento del stream en un solo archivo visible.
 *
 * Aporta: id de petición, métrica de duración y el error no esperado traducido a
 * una respuesta `{ ok: false }` en vez de un 500 con stack.
 */
export type GatewayHandler = (request: Request) => Promise<Response> | Response;

const HEADER_REQUEST_ID = 'x-request-id';

export function withGateway(scope: string, handler: GatewayHandler): GatewayHandler {
  return async (request: Request): Promise<Response> => {
    const startedAt = Date.now();
    const requestId = request.headers.get(HEADER_REQUEST_ID) ?? crypto.randomUUID();

    try {
      const response = await handler(request);
      response.headers.set(HEADER_REQUEST_ID, requestId);
      // `server-timing` para poder leer latencias del BFF desde la pestaña de red
      // sin levantar un APM.
      response.headers.set('server-timing', `bff;dur=${Date.now() - startedAt}`);
      return response;
    } catch (error) {
      const reported = reportError(error, { scope, tags: { requestId } });
      return Response.json(
        { ok: false, error: { statusCode: 500, code: reported.code ?? 'bff_error', message: reported.message } },
        { status: 500, headers: { [HEADER_REQUEST_ID]: requestId } }
      );
    }
  };
}

/** Lectura de JSON con cota de tamaño, para no bufferizar un cuerpo arbitrario. */
export async function readJsonBody<T>(request: Request, maxBytes: number): Promise<T | undefined> {
  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new BodyTooLargeError(maxBytes);
  }

  const buffer = await request.arrayBuffer();
  if (buffer.byteLength === 0) return undefined;
  if (buffer.byteLength > maxBytes) throw new BodyTooLargeError(maxBytes);

  return JSON.parse(new TextDecoder().decode(buffer)) as T;
}

export class BodyTooLargeError extends Error {
  constructor(readonly maxBytes: number) {
    super(`Cuerpo de petición supera el límite de ${maxBytes} bytes.`);
    this.name = 'BodyTooLargeError';
  }
}
