import type { APIRoute } from 'astro';

import { withGateway } from '@domains/agent-chat/server';
import { upstreamHealth } from '@shared/server/upstream-health';

/**
 * @file src/pages/api/health/upstream.ts
 * @description Sonda de salud del camino BFF → backend de agentes.
 *
 * Envoltorio de tres líneas, como el resto de `src/pages/api/**`. Responde
 * **siempre 200 si el BFF está vivo**: lo que puede estar caído es el upstream, y
 * eso viaja en el cuerpo (`upstream.reachable`). Un 5xx aquí confundiría "la app
 * no arranca" con "el backend de agentes no está levantado", que son dos averías
 * distintas y se arreglan de forma distinta.
 */
export const GET: APIRoute = ({ request }) =>
  withGateway('api/health/upstream', async () =>
    Response.json({ ok: true, upstream: await upstreamHealth() })
  )(request);
