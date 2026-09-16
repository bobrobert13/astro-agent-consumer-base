/**
 * @file src/shared/upstream/headers.ts
 * @description Único lugar del repo que lee la credencial y el host del backend de
 * agentes.
 *
 * Vive en `shared` y no dentro de un slice porque lo consumen varios: el relay de
 * `agent-chat`, el catálogo de `agent-registry` y los hilos de `agent-sessions`.
 * Un helper en `agent-chat/server/` obligaría a que otra slice importara internos
 * ajenos, que es justo lo que prohíbe la regla de fronteras.
 *
 * Solo importable desde carpetas `server` de un slice y desde `src/pages/api`
 * (lo comprueba `tests/architecture/boundaries.spec.ts`).
 *
 * Consecuencia para el CSP: el navegador nunca llama al upstream, así que basta
 * `connect-src 'self'` y un rastreo de red del usuario solo ve `127.0.0.1:<puerto>`.
 */
import { MASTRA_API_KEY, MASTRA_URL } from '@shared/env/server';

/** Cabeceras de petición hacia el upstream, con la credencial si está definida. */
export function upstreamHeaders(extra: HeadersInit = {}): Headers {
  const headers = new Headers(extra);
  if (!headers.has('accept')) headers.set('accept', 'text/event-stream, application/json');
  if (MASTRA_API_KEY !== undefined && MASTRA_API_KEY !== '') {
    headers.set('authorization', `Bearer ${MASTRA_API_KEY}`);
  }
  return headers;
}

/**
 * URL absoluta del upstream para una ruta relativa ya sin prefijo
 * (`agents/research`). Todas las llamadas externas salen por aquí.
 */
export function upstreamUrl(relativePath: string): URL {
  const base = MASTRA_URL.replace(/\/+$/, '');
  return new URL(`${base}/api/${relativePath.replace(/^\/+/, '')}`);
}
