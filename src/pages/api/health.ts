import type { APIRoute } from 'astro';

import { APP_VERSION, NEW_THREAD_ID } from '@config/app';
import { withGateway } from '@domains/agent-chat/server';
import { AGENT_TRANSPORT } from '@shared/env/client';

/**
 * @file src/pages/api/health.ts
 * @description Sonda de vida. Es también el punto de sincronización del shell
 * Electron: el proceso main hace poll de esta ruta hasta que contesta 200 antes
 * de mostrar la ventana (ver `electron/lib/astro-server.mjs`).
 *
 * No revela el host del upstream: la regla del boilerplate es que el navegador no
 * lo vea nunca, ni siquiera en un endpoint informativo. Para depurar la dirección
 * real, el log del servidor.
 *
 * Pasa por `withGateway` como el resto del BFF: era el único handler sin id de
 * petición ni cabecera `server-timing`, y eso lo dejaba fuera de la única traza
 * que se puede leer desde la pestaña de red sin un APM.
 */
export const GET: APIRoute = ({ request }) =>
  withGateway('api/health', () =>
    Response.json({
      ok: true,
      version: APP_VERSION,
      transport: AGENT_TRANSPORT,
      threadPlaceholder: NEW_THREAD_ID,
    })
  )(request);
