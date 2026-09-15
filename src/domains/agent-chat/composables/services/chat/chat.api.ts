import { httpGet } from '@shared/http/http-client';
import { resultError, type Result } from '@shared/result/result.pattern';
import type { TransportHealth } from '../../../transport/types';
import { CHAT_ERROR_CODES } from './chat.e';
import { chatEndpoints } from './chat.endpoints';

/**
 * @file src/domains/agent-chat/composables/services/chat/chat.api.ts
 * @description Operaciones de apoyo del chat sobre el BFF. Devuelven `Result` y
 * nunca lanzan.
 *
 * El *streaming* no pasa por aquí: esa ruta la toma el transporte
 * (`transport/mastra.ts`), porque necesita el cuerpo en vivo del SSE y su
 * formato nativo. Aquí solo hay peticiones JSON normales.
 */

/** Estado del BFF. Un fallo aquí no tumba la vista: devuelve `reachable: false`. */
export async function checkTransport(): Promise<Result<TransportHealth>> {
  const response = await httpGet<{ ok: boolean; transport?: string }>(chatEndpoints.health());

  if (!response.ok) {
    return resultError<TransportHealth>({
      statusCode: response.error.statusCode,
      code: CHAT_ERROR_CODES.transportUnavailable,
      message: 'No se pudo consultar el estado del backend.',
    });
  }

  return {
    ok: true,
    data: {
      reachable: response.data.ok === true,
      transport: response.data.transport === 'mastra' ? 'mastra' : 'mock',
    },
  };
}
