/**
 * @file src/shared/result/result.pattern.ts
 * @description Contrato `{ ok }` que devuelven TODAS las operaciones asíncronas
 * del proyecto, en el cliente y en el BFF.
 *
 * Es un calco del patrón `result.pattern.ts` de `simon-bolivar-college-system-ui`
 * (composables/handlers) a propósito: el equipo ya sabe leerlo y ya sabe que un
 * servicio no lanza excepciones.
 *
 * Reglas que sostienen el contrato:
 * - Un servicio que puede fallar devuelve `Promise<Result<T>>` y **nunca** lanza.
 * - `statusCode` es obligatorio: es lo que permite traducir a mensaje sin mirar
 *   el `code` en cada llamada.
 * - Este módulo no importa Vue, Astro ni ninguna librería de HTTP. Si algún día
 *   hace falta importar algo para vivir aquí, está en el sitio equivocado.
 */

/** Error normalizado que entienden la caché de queries y el manejador global. */
export interface ServiceError {
  code?: string | undefined;
  message?: string | undefined;
  field?: string | undefined;
  statusCode: number;
  details?: unknown;
  metadata?: unknown;
  raw?: unknown;
}

/** Operación asíncrona: o datos, o un error accionable. Nunca ambas. */
export type Result<T> = { ok: true; data: T } | { ok: false; error: ServiceError };

/** Crea un resultado exitoso. */
export function resultOk<T>(data: T): Result<T> {
  return { ok: true, data };
}

/** Crea un resultado fallido a partir de un error ya normalizado. */
export function resultError<T = never>(error: ServiceError): Result<T> {
  return { ok: false, error };
}

/**
 * Convierte cualquier valor lanzado (o un `Response` no ok) en `ServiceError`.
 *
 * Formas que reconoce, en orden:
 * 1. `ServiceError` ya normalizado (se pasa tal cual).
 * 2. Shape del BFF de este proyecto: `{ status, code, message }`.
 * 3. Shape de validación del backend: 422 con `details`/`metadata` como array de
 *    problemas `{ path: string[] } | { field: string }`.
 * 4. `Error` genérico → 500 con su `message`.
 */
export function normalizeServiceError(
  input: unknown,
  fallbackStatusCode = 500
): ServiceError {
  if (isServiceError(input)) return input;

  if (input instanceof Response) {
    return {
      statusCode: input.status || fallbackStatusCode,
      message: input.statusText || undefined,
      raw: { status: input.status },
    };
  }

  // `DOMException` **no** hereda de `Error`, así que este branch tiene que ir
  // antes del de `Error` y antes del genérico de objeto: una cancelación es un
  // caso de éxito abortado, no un fallo del sistema. `AbortSignal.timeout()`
  // llega por aquí como `TimeoutError`.
  const name = isRecord(input) || input instanceof Error ? input.name : undefined;
  if (name === 'AbortError') {
    return { code: 'aborted', statusCode: 499, message: 'Operación cancelada.' };
  }
  if (name === 'TimeoutError') {
    return { code: 'upstream_timeout', statusCode: 504, message: 'El agente tardó demasiado en responder.' };
  }

  if (input instanceof Error) {
    return { statusCode: fallbackStatusCode, message: input.message, raw: input };
  }

  if (isRecord(input)) {
    // El BFF envuelve los fallos como `{ ok: false, error: {…} }`. Sin este
    // desarrollo, un 404 de `/api/sessions` llegaría a la pantalla como un 500
    // genérico con el mensaje perdido.
    if (input['ok'] === false && isRecord(input['error'])) {
      return normalizeServiceError(input['error'], fallbackStatusCode);
    }

    const status = pickNumber(input, ['status', 'statusCode']) ?? fallbackStatusCode;
    const code = pickString(input, ['code']);
    const field = pickString(input, ['field']);
    const details = input['details'];
    const metadata = input['metadata'];
    const issue = firstFieldIssue(details) ?? firstFieldIssue(metadata);
    // El mensaje del problema de validación manda sobre el genérico: es el que
    // explica qué campo está mal.
    const message = issue?.message ?? pickString(input, ['message', 'error']);

    const resolvedField = issue?.field ?? field;

    return {
      ...(code !== undefined ? { code } : {}),
      ...(message !== undefined ? { message } : {}),
      ...(resolvedField !== undefined ? { field: resolvedField } : {}),
      statusCode: status,
      ...(details !== undefined ? { details } : {}),
      ...(metadata !== undefined ? { metadata } : {}),
    };
  }

  return { statusCode: fallbackStatusCode, message: String(input ?? 'Error desconocido.') };
}

/**
 * Desenrolla un `Result<T>`: datos si fue bien, `fallback` si falló.
 * Útil donde un error no cambia el flujo (renderizar lista vacía, seguir de largo).
 */
export function unwrapResult<T>(result: Result<T>, fallback: T): T {
  return result.ok ? result.data : fallback;
}

/** `true` si la forma es un `ServiceError` mínimo. */
function isServiceError(value: unknown): value is ServiceError {
  return isRecord(value) && typeof value['statusCode'] === 'number';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function pickString(source: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.length > 0) return value;
  }
  return undefined;
}

function pickNumber(source: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return undefined;
}

type ValidationIssue = { field?: unknown; path?: unknown; message?: unknown };

/** Saca el primer problema con campo resoluble de un payload 422. */
export function firstFieldIssue(
  payload: unknown
): { field?: string; message?: string | undefined } | undefined {
  if (!Array.isArray(payload)) return undefined;

  for (const entry of payload) {
    if (!isRecord(entry)) continue;
    const issue = entry as ValidationIssue;
    const message = typeof issue.message === 'string' ? issue.message : undefined;

    if (typeof issue.field === 'string') return { field: issue.field, message };
    if (Array.isArray(issue.path) && typeof issue.path[0] === 'string') {
      return { field: issue.path[0], message };
    }
  }
  return undefined;
}
