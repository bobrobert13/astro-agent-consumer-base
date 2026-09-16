import { httpGet, httpPut } from '@shared/http/http-client';
import { resultError, resultOk, type Result, type ServiceError } from '@shared/result/result.pattern';
import type { AgentRunSettings } from '../../../types/agent-config.types';
import { CONFIG_ERROR_CODES } from './config.e';
import { configEndpoints } from './config.endpoints';

/**
 * @file src/domains/agent-config/composables/services/config/config.api.ts
 * @description Lectura y escritura de la configuración por ejecución. `Result<T>`,
 * nunca lanza.
 *
 * El BFF responde con su propio sobre `{ ok, data }` además del `Result` de la
 * llamada: dos capas distintas (¿llegó la petición? / ¿la aceptó el negocio?).
 * Desembricarlas es trabajo de este archivo, no del componente.
 */
interface ConfigEnvelope {
  ok: boolean;
  data?: AgentRunSettings;
  error?: ServiceError;
}

export async function readAgentConfig(agentId: string): Promise<Result<AgentRunSettings>> {
  const response = await httpGet<ConfigEnvelope>(configEndpoints.forAgent(agentId));
  if (!response.ok) {
    return resultError<AgentRunSettings>({ ...response.error, code: response.error.code ?? CONFIG_ERROR_CODES.loadFailed });
  }
  if (response.data.ok !== true || response.data.data === undefined) {
    return resultError<AgentRunSettings>({
      statusCode: response.data.error?.statusCode ?? 502,
      code: response.data.error?.code ?? CONFIG_ERROR_CODES.loadFailed,
      message: response.data.error?.message,
    });
  }
  return resultOk(response.data.data);
}

export async function writeAgentConfig(
  agentId: string,
  settings: AgentRunSettings
): Promise<Result<AgentRunSettings>> {
  const response = await httpPut<ConfigEnvelope>(configEndpoints.forAgent(agentId), settings);
  if (!response.ok) {
    return resultError<AgentRunSettings>({ ...response.error, code: response.error.code ?? CONFIG_ERROR_CODES.saveFailed });
  }
  if (response.data.ok !== true || response.data.data === undefined) {
    return resultError<AgentRunSettings>({
      statusCode: response.data.error?.statusCode ?? 400,
      code: response.data.error?.code ?? CONFIG_ERROR_CODES.invalidConfig,
      message: response.data.error?.message,
      field: response.data.error?.field,
    });
  }
  // El eco del BFF es la versión validada: con ella el formulario muestra exactamente
  // lo que el servidor guardó, no lo que el usuario tecleó.
  return resultOk(response.data.data);
}
