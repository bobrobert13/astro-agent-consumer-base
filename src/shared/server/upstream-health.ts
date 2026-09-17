import { upstreamJson } from './fetch-json';

/**
 * @file src/shared/server/upstream-health.ts
 * @description Sonda profunda del backend de agentes.
 *
 * Vive aparte de `/api/health` a propósito, y no es un capricho de organización:
 * ese endpoint es el punto de sincronización del shell de escritorio —el proceso
 * main hace poll hasta que contesta 200 antes de mostrar la ventana— así que
 * tiene que responder rápido y en verde **aunque el backend esté caído**. Esta
 * sonda, en cambio, sí paga una ida y vuelta y por eso tiene su propia ruta.
 *
 * Contesta sin revelar el host del upstream ni el texto de error del backend
 * (regla de la casa: el navegador no ve la dirección real, ni siquiera en un
 * endpoint informativo). Para depurar la dirección, el log del servidor.
 */

/** Presupuesto de la sonda: es un chequeo de estado, no una ejecución. */
const PROBE_TIMEOUT_MS = 2_000;

export interface UpstreamHealth {
  reachable: boolean;
  /** Solo si el backend contestó y lo declaró. */
  version?: string;
  env?: string;
}

/** Estado del backend tal como lo ve el BFF. Nunca lanza. */
export async function upstreamHealth(): Promise<UpstreamHealth> {
  const response = await upstreamJson<{ version?: unknown; env?: unknown }>('health/version', {
    // `health/version` es una ruta CUSTOM de Mastra: cuelga de la raíz, no de
    // `/api` (que es lo que el framework reserva para sí).
    mount: 'root',
    signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
  });

  if (!response.ok) return { reachable: false };

  const { version, env } = response.data;
  return {
    reachable: true,
    ...(typeof version === 'string' ? { version } : {}),
    ...(typeof env === 'string' ? { env } : {}),
  };
}
