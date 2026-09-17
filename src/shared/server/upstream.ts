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
 * URL absoluta del upstream para una ruta relativa (`agents/research`), colgada
 * del `/api` del framework. Todas las llamadas externas al API de Mastra salen
 * por aquí.
 */
export function upstreamUrl(relativePath: string): URL {
  return upstreamAbsolute(`api/${relativePath.replace(/^\/+/, '')}`);
}

/**
 * URL absoluta del upstream para una ruta relativa de **raíz**, sin el `/api`.
 *
 * La necesitan las rutas custom de Mastra, que son root-level por obligación
 * (`validateCustomRoutePaths` rechaza cualquier path que empiece por `/api` al
 * arrancar el servidor): hoy, el stream de chat en `/chat/:agentId`.
 */
export function upstreamRootUrl(relativePath: string): URL {
  return upstreamAbsolute(relativePath.replace(/^\/+/, ''));
}

/** Único punto que concatena `MASTRA_URL`; los dos constructores de arriba lo usan. */
function upstreamAbsolute(relativePath: string): URL {
  const base = MASTRA_URL.replace(/\/+$/, '');
  return new URL(`${base}/${relativePath}`);
}
