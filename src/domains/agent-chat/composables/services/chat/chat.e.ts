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

/**
 * Avisos de bloqueo. No son errores de transporte: el backend decidió no ejecutar
 * el mensaje, y el usuario tiene que ver **por qué**. Sin esto, un bloqueo llega
 * como una parte de datos que nadie pinta y el chat parece no hacer nada.
 */
export const CHAT_NOTICE_CODES = {
  outOfScope: 'out_of_scope',
  securityBlock: 'security_block',
} as const;

const NOTICES: Record<string, string> = {
  [CHAT_NOTICE_CODES.outOfScope]: 'Este agente solo atiende su ámbito. Prueba con otro agente del catálogo.',
  [CHAT_NOTICE_CODES.securityBlock]: 'El mensaje se bloqueó por seguridad y no llegó al agente.',
};

/** Texto presentable para un aviso de bloqueo. */
export function resolveNoticeMessage(code: string): string {
  return NOTICES[code] ?? MESSAGES[CHAT_ERROR_CODES.agentError] ?? 'El agente no ejecutó el mensaje.';
}

/**
 * Qué aviso corresponde al `processorId` que reporta el backend.
 *
 * La distinción no es cosmética: el scope guard manda **copy nuestra** (la política
 * de alcance y la redirección a los agentes hermanos), que es justo la parte
 * accionable y por eso se muestra como detalle. El detector de inyección manda un
 * motivo que redacta **el modelo**, así que se queda en el log y a la pantalla va
 * solo el catálogo (regla de la casa: ningún texto del proveedor se pinta).
 */
export function noticeForProcessor(processorId: string | undefined): {
  code: string;
  showDetail: boolean;
} {
  return processorId?.startsWith('scope-guard:') === true
    ? { code: CHAT_NOTICE_CODES.outOfScope, showDetail: true }
    : { code: CHAT_NOTICE_CODES.securityBlock, showDetail: false };
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
