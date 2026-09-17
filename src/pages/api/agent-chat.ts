import type { APIRoute } from 'astro';

import { chatUpstreamPath, relayStream, withGateway } from '@domains/agent-chat/server';

/**
 * @file src/pages/api/agent-chat.ts
 * @description Ejecución de chat: reenvío **verbatim** del stream del agente.
 *
 * Envoltorio de tres líneas, como el resto de `src/pages/api/**`: la lógica vive
 * en `@domains/agent-chat/server`. Dos cosas que este endpoint NO hace, y que
 * conviene no añadir aquí:
 *
 *  - **No lee el cuerpo.** El destino depende del `agentId` que viaja dentro, y lo
 *    resuelve el relay (`chatUpstreamPath`) sobre la única lectura posible del
 *    `Request`. Validar aquí consumiría el cuerpo y el relay no tendría nada que
 *    reenviar.
 *  - **No conoce el upstream.** La URL real y la credencial salen por
 *    `@shared/server/upstream`; el navegador nunca las ve.
 *
 * Monta en la **raíz** del backend (`mount: 'root'`): el chat es una ruta custom de
 * Mastra (`/chat/:agentId`), no una del API del framework — Mastra rechaza al
 * arrancar cualquier ruta custom que empiece por `/api`.
 */
export const POST: APIRoute = ({ request }) =>
  withGateway('api/agent-chat', () =>
    relayStream(request, { routeFromBody: chatUpstreamPath, mount: 'root' })
  )(request);
