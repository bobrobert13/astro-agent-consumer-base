/**
 * @file src/domains/agent-chat/server/relay-body.ts
 * @description Preparación del cuerpo que el relay reenvía al upstream.
 *
 * Existe por una razón concreta: la identidad de memoria **no puede venir del
 * navegador**. El cuerpo que llega al relay lo construye el cliente del proveedor
 * (`@mastra/client-js`) a partir de las opciones de `agent.stream()`, así que el
 * `resource` viaja dentro de un JSON cuyo formato no es nuestro. Este módulo es
 * el único sitio que abre ese JSON, y lo abre con dos reglas:
 *
 *  1. **Solo se toca lo que se conoce.** Se reescriben `memory.resource` y
 *     `memory.thread`; cualquier otra clave se devuelve intacta.
 *  2. **Si hay que reescribir, se reescribe; si no, se copian los bytes.** Un
 *     cuerpo sin `memory` se reenvía tal cual llegó, sin reserializar, para no
 *     cambiar el wire format del proveedor por reformatear de más.
 *
 * Lo que **no** se hace aquí es validar el cuerpo contra `runRequestSchema`: ese
 * schema describe el contrato propio del BFF (`{ prompt, thread, config }`, la
 * ruta que construye `chat.endpoints.run` y que es el plan B del riesgo R1), y el
 * SDK no lo usa. Aplicarlo aquí rechazaría el 100 % de las peticiones reales.
 */
import { readBodyText } from './gateway';
import type { SessionScope } from './session-scope';

/**
 * Techo del cuerpo reenviado. Muy por debajo del `bodySizeLimit` del adapter
 * (2 MB): aquí solo pasan mensajes, configuración y memoria. El adapter sigue
 * siendo la última red; esta es la primera y la que puede dar un 413 explicable.
 */
export const MAX_RELAY_BODY_BYTES = 256 * 1024;

export type RelayBody =
  /** GET/HEAD: no hay cuerpo que reenviar. */
  | { mode: 'none' }
  /** Cuerpo opaco (no JSON): se reenvía en streaming, byte a byte. */
  | { mode: 'opaque'; body: ReadableStream<Uint8Array> }
  /** Cuerpo JSON leído y acotado, candidato a normalización. */
  | { mode: 'json'; raw: string; parsed: unknown };

/** Lee el cuerpo del cliente según su content-type. Lanza `BodyTooLargeError`. */
export async function readRelayBody(request: Request, maxBytes = MAX_RELAY_BODY_BYTES): Promise<RelayBody> {
  if (request.method === 'GET' || request.method === 'HEAD' || request.body === null) {
    return { mode: 'none' };
  }

  if (!isJsonContentType(request.headers.get('content-type'))) {
    return { mode: 'opaque', body: request.body };
  }

  const raw = await readBodyText(request, maxBytes);
  try {
    return { mode: 'json', raw, parsed: raw.trim() === '' ? undefined : JSON.parse(raw) };
  } catch {
    // Un JSON ilegible no es asunto del relay: `parsed` queda sin objeto, así que
    // `bodyWithScope` reenvía `raw` tal cual y lo rechaza quien lo entiende, con
    // su propio mensaje.
    return { mode: 'json', raw, parsed: undefined };
  }
}

/**
 * Cuerpo definitivo hacia el upstream, con la identidad del servidor inyectada.
 * Devuelve `null` cuando no hay cuerpo.
 */
export function bodyWithScope(relayBody: RelayBody, scope: SessionScope): BodyInit | null {
  switch (relayBody.mode) {
    case 'none':
      return null;
    case 'opaque':
      return relayBody.body;
    case 'json': {
      const rewritten = withServerScope(relayBody.parsed, scope);
      return rewritten === relayBody.parsed ? relayBody.raw : JSON.stringify(rewritten);
    }
  }
}

/**
 * Fija `memory.resource` y `memory.thread` en el cuerpo del proveedor.
 *
 * Devuelve **el mismo objeto** si no hay nada que tocar (cuerpo que no es objeto,
 * o sin un `memory` sobre el que escribir): así el llamador puede distinguir
 * "reescrito" de "intacto" por identidad y decidir si reenvía los bytes o el JSON.
 */
export function withServerScope(payload: unknown, scope: SessionScope): unknown {
  const memory = memoryOf(payload);
  if (memory === undefined) return payload;
  return { ...(payload as Record<string, unknown>), memory: { ...memory, resource: scope.resource, thread: scope.thread } };
}

/** Hilo pedido por el cliente, para que pase por `sanitizeThread`. */
export function requestedThread(payload: unknown): string | undefined {
  const memory = memoryOf(payload);
  const thread = memory?.['thread'];
  return typeof thread === 'string' ? thread : undefined;
}

function memoryOf(payload: unknown): Record<string, unknown> | undefined {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) return undefined;
  const memory = (payload as Record<string, unknown>)['memory'];
  if (typeof memory !== 'object' || memory === null || Array.isArray(memory)) return undefined;
  return memory as Record<string, unknown>;
}

export function isJsonContentType(value: string | null): boolean {
  return value !== null && value.toLowerCase().includes('application/json');
}
