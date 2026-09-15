/**
 * @file src/shared/http/http-client.ts
 * @description `fetch` con timeout, guard de JSON y contrato `Result<T>`.
 *
 * Sin axios: `AbortSignal.timeout` nativo cubre el caso, y en el objetivo del
 * boilerplate (navegador + Node 22 + el Chromium de Electron 44) fetch está
 * garantizado. Añadir una capa de HTTP aquí sería una dependencia más que la UI
 * no pide.
 *
 * Nunca lanza. Un fallo de red, un 500 o un body malformado vuelven como
 * `Result` con `error`, listo para el catálogo de mensajes del slice.
 */
import {
  normalizeServiceError,
  resultError,
  resultOk,
  type Result,
  type ServiceError,
} from '@shared/result/result.pattern';

const DEFAULT_TIMEOUT_MS = 15_000;

export interface HttpRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  timeoutMs?: number;
}

/**
 * Ejecuta una petición y devuelve el JSON tipado como `T`.
 *
 * El `T` es una aserción del llamador, no una validación: si el contrato importa
 * de verdad (p. ej. datos que llegan de un proveedor externo), valide en el BFF
 * con zod y deje que el cliente confíe en el DTO ya normalizado.
 */
export async function requestJson<T>(
  url: string,
  options: HttpRequestOptions = {}
): Promise<Result<T>> {
  const { method = 'GET', body, headers = {}, signal, timeoutMs = DEFAULT_TIMEOUT_MS } = options;

  const composed = signal
    ? AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)])
    : AbortSignal.timeout(timeoutMs);

  try {
    const response = await fetch(url, {
      method,
      signal: composed,
      headers: body === undefined ? headers : { 'content-type': 'application/json', ...headers },
      // `null`, no `undefined`: con `exactOptionalPropertyTypes` un `body`
      // opcional indefinido no pasa el contrato de `RequestInit`.
      body: body === undefined ? null : JSON.stringify(body),
    });

    if (!response.ok) {
      return resultError<T>(await errorFromResponse(response));
    }

    if (response.status === 204) return resultOk(undefined as T);

    return resultOk((await response.json()) as T);
  } catch (error) {
    return resultError<T>(normalizeServiceError(error));
  }
}

export const httpGet = <T>(url: string, options?: HttpRequestOptions): Promise<Result<T>> =>
  requestJson<T>(url, { ...options, method: 'GET' });

export const httpPost = <T>(url: string, body?: unknown, options?: HttpRequestOptions): Promise<Result<T>> =>
  requestJson<T>(url, { ...options, method: 'POST', body });

export const httpPut = <T>(url: string, body?: unknown, options?: HttpRequestOptions): Promise<Result<T>> =>
  requestJson<T>(url, { ...options, method: 'PUT', body });

export const httpPatch = <T>(url: string, body?: unknown, options?: HttpRequestOptions): Promise<Result<T>> =>
  requestJson<T>(url, { ...options, method: 'PATCH', body });

export const httpDelete = <T>(url: string, options?: HttpRequestOptions): Promise<Result<T>> =>
  requestJson<T>(url, { ...options, method: 'DELETE' });

/**
 * Lee el cuerpo de un error sin asumir que es JSON: un proxy, una página de
 * mantenimiento de Astro o un HTML de Electron devuelven texto.
 */
async function errorFromResponse(response: Response): Promise<ServiceError> {
  const text = await response.text().catch(() => '');
  if (text.length > 0) {
    try {
      return normalizeServiceError(JSON.parse(text) as unknown, response.status);
    } catch {
      /* body no era JSON: se cae al shape mínimo de abajo. */
    }
  }
  return normalizeServiceError(
    { status: response.status, message: response.statusText || undefined },
    response.status
  );
}
