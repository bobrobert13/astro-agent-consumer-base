import type { APIRoute } from 'astro';

import { getAgent } from '@domains/agent-registry/server';
import { withGateway } from '@domains/agent-chat/server';

/**
 * @file src/pages/api/agents/[agentId]/index.ts
 * @description Detalle de un agente, con las herramientas ya recortadas a nombres.
 */
export const GET: APIRoute = ({ request, params }) =>
  withGateway('api/agents/[agentId]', async () => {
    const agentId = params['agentId'];
    if (agentId === undefined) {
      return Response.json({ ok: false, error: { statusCode: 400, code: 'invalid_path' } }, { status: 400 });
    }

    const result = await getAgent(agentId);
    if (!result.ok) {
      return Response.json({ ok: false, error: result.error }, { status: result.error.statusCode });
    }
    if (result.data === undefined) {
      return Response.json(
        { ok: false, error: { statusCode: 404, code: 'agent_not_found', message: 'Ese agente no existe.' } },
        { status: 404 }
      );
    }
    return Response.json({ ok: true, data: result.data });
  })(request);
