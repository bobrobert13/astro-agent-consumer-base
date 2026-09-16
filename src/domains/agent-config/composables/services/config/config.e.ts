/**
 * @file src/domains/agent-config/composables/services/config/config.e.ts
 * @description Códigos de error del slice y su texto en español. Misma regla que
 * en `agent-chat`: ningún código llega a la pantalla sin catálogo.
 */
import type { ServiceError } from '@shared/result/result.pattern';

export const CONFIG_ERROR_CODES = {
  loadFailed: 'config_load_failed',
  saveFailed: 'config_save_failed',
  invalidConfig: 'invalid_config',
  agentNotFound: 'agent_not_found',
} as const;

const MESSAGES: Record<string, string> = {
  [CONFIG_ERROR_CODES.loadFailed]:
    'No se pudo leer la configuración del agente. Los valores que ves son los por defecto.',
  [CONFIG_ERROR_CODES.saveFailed]: 'El backend no aceptó la configuración. Puedes reintentar.',
  [CONFIG_ERROR_CODES.invalidConfig]: 'Algún valor no es válido. Revisa el modelo y la temperatura.',
  [CONFIG_ERROR_CODES.agentNotFound]: 'Ese agente ya no está disponible.',
};

function messageFor(code: string | undefined): string | undefined {
  return code === undefined ? undefined : MESSAGES[code];
}

export function resolveConfigErrorMessage(error: ServiceError): string {
  const byCode = messageFor(error.code);
  if (byCode !== undefined) return byCode;

  // Solo los estados que este slice sabe explicar: para el resto es mejor el
  // mensaje de quien falló que un texto genérico nuestro.
  const byStatus =
    error.statusCode === 404
      ? messageFor(CONFIG_ERROR_CODES.agentNotFound)
      : error.statusCode === 400
        ? messageFor(CONFIG_ERROR_CODES.invalidConfig)
        : undefined;

  return byStatus ?? error.message ?? 'No se pudo guardar la configuración.';
}
