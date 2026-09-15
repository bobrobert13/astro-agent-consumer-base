import type { APIRoute } from 'astro';

import { listAgents } from '@domains/agent-registry/server';
import { withGateway } from '@domains/agent-chat/server';

/**
 * @file src/pages/api/agents/index.ts
 * @description Catálogo de agentes normalizado.
 *
 * Los endpoints son envoltorios de pocas líneas a propósito: la lógica vive en
 * `@domains/agent-registry/server`, que es unit-testable sin arrancar Astro.
 */
export const GET: APIRoute = ({ request }) =>
  withGateway('api/agents', async () => {
    const result = await listAgents();
    return result.ok
      ? Response.json({ ok: true, data: result.data })
      : Response.json({ ok: false, error: result.error }, { status: result.error.statusCode });
  })(request);
