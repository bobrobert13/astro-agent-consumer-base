import type { APIRoute } from 'astro';

import { relayStream, withGateway } from '@domains/agent-chat/server';

/**
 * @file src/pages/api/agent-rpc/[...path].ts
 * @description Prefijo único por donde el navegador habla con el backend de
 * agentes. Reenvía la **respuesta** sin tocar un byte.
 *
 * `/api/agent-rpc/stream/research` → `${MASTRA_URL}/api/stream/research`
 *
 * Todo lo que el relay sabe del formato del stream es que existe un `content-type`
 * y unos bytes. El contrato del wire format lo interpreta el cliente en el
 * navegador (`transport/mastra.ts`), que es quien lo entiende nativamente.
 *
 * El **cuerpo de la petición** sí se abre, en `server/relay-body.ts` y solo para
 * dos cosas: acotarlo de tamaño e inyectar la identidad de memoria que decide el
 * servidor. La respuesta no pasa por ahí.
 *
 * La ruta es catch-all a propósito: si mañana el proveedor añade
 * `/api/agents/:id/continue`, la isla lo usa sin tocar este archivo.
 */
export const ALL: APIRoute = ({ request, params }) =>
  withGateway('api/agent-rpc', async () => {
    // Astro ya entrega el rest de `[...path]` unido con `/`.
    return relayStream(request, { path: params['path'] ?? '' });
  })(request);
