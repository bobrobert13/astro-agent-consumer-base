/**
 * @file src/domains/agent-config/server/read-config.ts
 * @description Lectura de la configuración de un agente, del lado del servidor.
 *
 * Lo usan dos caminos que necesitan exactamente lo mismo: la ruta
 * `GET /api/agents/:agentId/config` (petición del navegador) y `settings.astro`,
 * que resuelve la config durante el render para que el formulario nazca
 * utilizable. Antes la lógica vivía dentro de la ruta, así que la página no tenía
 * forma de reutilizarla sin saltarse la estructura.
 *
 * Nunca falla por el upstream: si el backend no expone el recurso (o no contesta),
 * devuelve los valores por defecto. Una configuración no disponible no debe
 * bloquear el chat ni dejar el formulario muerto.
 */
import { resultOk, type Result } from '@shared/result/result.pattern';
import { upstreamJson } from '@shared/server/fetch-json';
import { agentConfigSchema } from './config.schema';
import type { AgentRunSettings } from '../types/agent-config.types';

export interface ReadConfigOptions {
  /**
   * Corta la espera al upstream. El render de una página lo usa con un
   * presupuesto corto: la config resuelta en el servidor ahorra un viaje de ida y
   * vuelta al hidratar, pero no a costa del TTFB. Sin señal, manda el timeout de
   * conexión del relay (`AGENT_CONNECT_TIMEOUT`).
   */
  signal?: AbortSignal | undefined;
}

export async function readAgentConfig(
  agentId: string,
  options: ReadConfigOptions = {}
): Promise<Result<AgentRunSettings>> {
  const upstream = await upstreamJson<unknown>(
    `agents/${encodeURIComponent(agentId)}/config`,
    options.signal === undefined ? {} : { signal: options.signal }
  );

  // Forma desconocida, proveedor sin el endpoint o backend caído: defaults.
  const candidate = upstream.ok ? upstream.data : {};
  const parsed = agentConfigSchema.safeParse(candidate);
  return resultOk(parsed.success ? parsed.data : agentConfigSchema.parse({}));
}
