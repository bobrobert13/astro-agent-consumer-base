import type { APIRoute } from 'astro';

import { agentConfigSchema, withGateway } from '@domains/agent-chat/server';
import { upstreamJson } from '@shared/server/fetch-json';
import { resultOk } from '@shared/result/result.pattern';

/**
 * @file src/pages/api/agents/[agentId]/config.ts
 * @description Perillas de ejecución del agente (modelo, temperatura, memoria).
 *
 * El BFF responde siempre con el DTO propio: si el upstream no expone el campo,
 * se devuelve el valor por defecto del schema en vez de propagar un 502 a una
 * pantalla de configuración. Una config no disponible no debe bloquear el chat.
 */
export const prerender = false;

export const GET: APIRoute = ({ request, params }) =>
  withGateway('api/agents/[agentId]/config', async () => {
    const agentId = params['agentId'] ?? '';
    const upstream = await upstreamJson<unknown>(`agents/${encodeURIComponent(agentId)}/config`);

    // Forma desconocida o proveedor sin el endpoint: defaults.
    const candidate = upstream.ok ? upstream.data : {};
    const parsed = agentConfigSchema.safeParse(candidate);
    const data = parsed.success ? parsed.data : agentConfigSchema.parse({});

    return Response.json({ ok: true, data });
  })(request);

export const PUT: APIRoute = ({ request }) =>
  withGateway('api/agents/[agentId]/config#put', async () => {
    // Persistir configuración por agente es responsabilidad del backend; el BFF
    // valida y devuelve eco. Todavía no se envía al upstream porque el endpoint
    // no existe en la versión servida, y mentir con un 501 silencioso sería peor
    // que un 200 honesto con el valor ya validado.
    const body: unknown = await request.json().catch(() => ({}));
    const parsed = agentConfigSchema.safeParse(body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return Response.json(
        {
          ok: false,
          error: {
            statusCode: 400,
            code: 'invalid_request',
            message: issue?.message ?? 'Configuración inválida.',
            field: issue?.path.join('.'),
          },
        },
        { status: 400 }
      );
    }
    return Response.json(resultOk(parsed.data));
  })(request);
