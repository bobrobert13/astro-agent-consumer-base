import type { APIRoute } from 'astro';

import { listThreads } from '@domains/agent-sessions/server';
import { resolveScope, withGateway } from '@domains/agent-chat/server';

/**
 * @file src/pages/api/sessions/index.ts
 * @description Hilos de la identidad resuelta por el servidor.
 */
export const GET: APIRoute = ({ request }) =>
  withGateway('api/sessions', async () => {
    const { resource } = resolveScope(request);
    const result = await listThreads(resource);
    return result.ok
      ? Response.json({ ok: true, data: result.data })
      : Response.json({ ok: false, error: result.error }, { status: result.error.statusCode });
  })(request);
