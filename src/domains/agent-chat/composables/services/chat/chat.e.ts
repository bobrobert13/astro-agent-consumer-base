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
  /** El mensaje supera lo que el BFF acepta reenviar. */
  payloadTooLarge: 'payload_too_large',
  /** Ruta del relay mal formada (traversal, vacía). */
  invalidPath: 'invalid_path',
  /** Fallo no clasificado del propio BFF. */
  bffError: 'bff_error',
} as const;

const MESSAGES: Record<string, string> = {
  [CHAT_ERROR_CODES.upstreamUnreachable]:
    'No puedo hablar con el backend de agentes. Comprueba que esté levantado o deja el transporte en mock.',
  [CHAT_ERROR_CODES.agentNotFound]: 'Ese agente no existe. Selecciónalo de nuevo en el catálogo.',
  [CHAT_ERROR_CODES.streamStalled]:
    'El agente lleva un rato sin responder. Puedes detener el intento y volver a lanzarlo.',
  [CHAT_ERROR_CODES.aborted]: 'Se canceló la respuesta.',
  [CHAT_ERROR_CODES.invalidRequest]: 'El mensaje no se pudo enviar. Revisa el texto.',
  [CHAT_ERROR_CODES.transportUnavailable]: 'El transporte de agentes no está disponible.',
  [CHAT_ERROR_CODES.agentError]:
    'El agente no pudo terminar la respuesta. Si el problema persiste, revisa el estado del backend en el log del servidor.',
  [CHAT_ERROR_CODES.payloadTooLarge]:
    'El mensaje es demasiado largo para enviarlo. Divídelo en varios o adjunta menos contenido.',
  [CHAT_ERROR_CODES.invalidPath]: 'La dirección de la ejecución no es válida. Vuelve a abrir el hilo.',
  [CHAT_ERROR_CODES.bffError]: 'El servidor de la aplicación falló al atender la petición.',
};

/**
 * Código del catálogo a partir del texto de un error, si ese texto **es** un código.
 *
 * Existe porque el AI SDK entrega los fallos como `Error` con un mensaje de texto
 * y sin código: el mock emite el código tal cual —así el catálogo se puede
 * ejercitar sin backend— y el upstream real emite internos que no coinciden con
 * nada y caen al mensaje genérico, sin llegar nunca a la pantalla.
 */
export function chatErrorCodeFrom(value: string): string | undefined {
  return Object.values(CHAT_ERROR_CODES).find((code) => code === value);
}

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
    case 413:
      return MESSAGES[CHAT_ERROR_CODES.payloadTooLarge];
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
