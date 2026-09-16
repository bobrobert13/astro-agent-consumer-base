import type { APIRoute } from 'astro';

import { listThreads } from '@domains/agent-sessions/server';
import { resolveScope, withGateway } from '@domains/agent-chat/server';

/**
 * @file src/pages/api/sessions/index.ts
 * @description Hilos de la identidad resuelta por el servidor.
 *
 * Emite la cookie de identidad cuando no existía: es la misma decisión que toma
 * el relay (`session-scope.ts`), y si solo la emitiera uno de los dos, listar
 * hilos y conversar usarían recursos distintos.
 */
export const GET: APIRoute = ({ request }) =>
  withGateway('api/sessions', async () => {
    const { resource, setCookie } = resolveScope(request);
    const result = await listThreads(resource);
    const headers = setCookie === undefined ? undefined : { 'set-cookie': setCookie };
    return result.ok
      ? Response.json({ ok: true, data: result.data }, headers === undefined ? {} : { headers })
      : Response.json({ ok: false, error: result.error }, { status: result.error.statusCode, ...(headers ?? {}) });
  })(request);
