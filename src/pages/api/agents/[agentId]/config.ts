import type { APIRoute } from 'astro';

import { CONFIG_ERROR_CODES } from '@domains/agent-config';
import { agentConfigSchema, readAgentConfig } from '@domains/agent-config/server';
import { withGateway } from '@domains/agent-chat/server';
import { resultOk } from '@shared/result/result.pattern';

/**
 * @file src/pages/api/agents/[agentId]/config.ts
 * @description Perillas de ejecución del agente (modelo, temperatura, memoria).
 *
 * Envoltorio: la lectura vive en `@domains/agent-config/server`, porque
 * `settings.astro` necesita **la misma** durante el render. Duplicarla aquí era
 * la forma segura de que las dos se separaran.
 *
 * El BFF responde siempre con el DTO propio: si el upstream no expone el campo,
 * se devuelve el valor por defecto del schema en vez de propagar un 502 a una
 * pantalla de configuración. Una config no disponible no debe bloquear el chat.
 */
export const prerender = false;

export const GET: APIRoute = ({ request, params }) =>
  withGateway('api/agents/[agentId]/config', async () => {
    const result = await readAgentConfig(params['agentId'] ?? '');
    return Response.json({ ok: true, data: result.ok ? result.data : agentConfigSchema.parse({}) });
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
            // El código declarado en `config.e.ts` es `invalid_config`; emitir
            // `invalid_request` dejaba el catálogo sin usar y la UI traduciendo
            // por estado HTTP en vez de por código.
            code: CONFIG_ERROR_CODES.invalidConfig,
            message: issue?.message ?? 'Configuración inválida.',
            field: issue?.path.join('.'),
          },
        },
        { status: 400 }
      );
    }
    return Response.json(resultOk(parsed.data));
  })(request);
