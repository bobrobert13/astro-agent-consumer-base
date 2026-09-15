import type { APIRoute } from 'astro';

import { resolveScope, sanitizeThread, withGateway } from '@domains/agent-chat/server';
import { upstreamJson } from '@shared/server/fetch-json';

/**
 * @file src/pages/api/sessions/[threadId]/index.ts
 * @description Operaciones sobre un hilo: leer, renombrar, borrar.
 *
 * El `threadId` de la ruta se sanea antes de armar la URL del upstream, y el
 * `resource` lo fija el servidor: sin ambas, la ruta sería un proxy abierto a la
 * memoria de cualquier identidad.
 */
export const GET: APIRoute = ({ request, params }) =>
  withGateway('api/sessions/[threadId]#get', async () =>
    forward(request, params, 'GET'))(request);

export const PATCH: APIRoute = ({ request, params }) =>
  withGateway('api/sessions/[threadId]#patch', async () =>
    forward(request, params, 'PATCH'))(request);

export const DELETE: APIRoute = ({ request, params }) =>
  withGateway('api/sessions/[threadId]#delete', async () =>
    forward(request, params, 'DELETE'))(request);

async function forward(request: Request, params: Record<string, string | undefined>, method: string): Promise<Response> {
  const { resource } = resolveScope(request);
  const threadId = sanitizeThread(params['threadId']);
  const body = method === 'GET' || method === 'DELETE' ? undefined : await request.json().catch(() => ({}));

  const target = `memory/threads/${encodeURIComponent(threadId)}?resourceid=${encodeURIComponent(resource)}`;
  const result = await upstreamJson<unknown>(target, {
    method,
    body: body === undefined ? null : JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });

  return result.ok
    ? Response.json({ ok: true, data: result.data })
    : Response.json({ ok: false, error: result.error }, { status: result.error.statusCode });
}
