/**
 * @file src/domains/agent-chat/composables/services/chat/chat.e.ts
 * @description Códigos de error del slice y su texto en español.
 *
 * Regla del repo: ningún código llega a la pantalla sin estar aquí. El servicio
 * devuelve `code`, la UI pregunta por el mensaje. Así un texto de desarrollador
 * del proveedor nunca se cuela en la interfaz, y traducir el producto algún día
 * es cambiar este catálogo, no cada componente.
 */
import type { ServiceError } from '@shared/result/result.pattern';

export const CHAT_ERROR_CODES = {
  upstreamUnreachable: 'upstream_unreachable',
  agentNotFound: 'agent_not_found',
  streamStalled: 'stream_stalled',
  aborted: 'aborted',
  invalidRequest: 'invalid_request',
  transportUnavailable: 'transport_unavailable',
  agentError: 'agent_error',
} as const;

const MESSAGES: Record<string, string> = {
  [CHAT_ERROR_CODES.upstreamUnreachable]:
    'No puedo hablar con el backend de agentes. Comprueba que esté levantado o deja el transporte en mock.',
  [CHAT_ERROR_CODES.agentNotFound]: 'Ese agente no existe. Selecciona otro en el catálogo.',
  [CHAT_ERROR_CODES.streamStalled]:
    'El agente lleva un rato sin responder. Puedes detener el intento y volver a lanzarlo.',
  [CHAT_ERROR_CODES.aborted]: 'Se canceló la respuesta.',
  [CHAT_ERROR_CODES.invalidRequest]: 'El mensaje no se pudo enviar. Revisa el texto.',
  [CHAT_ERROR_CODES.transportUnavailable]: 'El transporte de agentes no está disponible.',
  [CHAT_ERROR_CODES.agentError]:
    'El agente no pudo terminar la respuesta. Si el problema persiste, revisa el estado del backend en el log del servidor.',
};

/** Mensaje presentable para un error de servicio, con degradación razonable. */
export function resolveChatErrorMessage(error: ServiceError): string {
  const byCode = error.code === undefined ? undefined : MESSAGES[error.code];
  if (byCode !== undefined) return byCode;

  const byStatus = messagesByStatus(error.statusCode);
  if (byStatus !== undefined) return byStatus;

  // Última salida: solo un mensaje del propio operador, nunca un stack.
  return error.message ?? 'Algo salió mal. Inténtalo de nuevo.';
}

/**
 * Traducción por estado HTTP, solo para los estados que este slice sabe explicar.
 *
 * Deliberadamente no hay un `>= 400` barrido: para un estado no contemplado es
 * mejor dejar el mensaje que escribió quien falló (que seguramente explica el
 * caso concreto) que sustituirlo por un texto genérico del frontend.
 */
function messagesByStatus(statusCode: number): string | undefined {
  switch (statusCode) {
    case 499:
      return MESSAGES[CHAT_ERROR_CODES.aborted];
    case 404:
      return MESSAGES[CHAT_ERROR_CODES.agentNotFound];
    case 400:
      return MESSAGES[CHAT_ERROR_CODES.invalidRequest];
    case 504:
      return MESSAGES[CHAT_ERROR_CODES.streamStalled];
    case 429:
      return 'Hay demasiadas peticiones ahora mismo. Espera un momento.';
    case 502:
    case 503:
      return MESSAGES[CHAT_ERROR_CODES.upstreamUnreachable];
    default:
      return undefined;
  }
}
