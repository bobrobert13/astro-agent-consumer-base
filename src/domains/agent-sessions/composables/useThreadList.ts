import { defineQuery } from '@pinia/colada';

import { httpGet } from '@shared/http/http-client';
import type { Page, ThreadSummary } from '../types/session.types';

/**
 * @file src/domains/agent-sessions/composables/useThreadList.ts
 * @description Hilos de la sesión actual, cacheados.
 *
 * El `resource` no lo pide el cliente: lo deriva el servidor desde su cookie
 * (`agent-chat/server/session-scope.ts`). Por eso la clave de caché es fija —
 * cambiar de identidad cambia la respuesta en el servidor, no la key aquí.
 */
export const THREADS_QUERY_KEY = ['agent-sessions', 'threads'] as const;

interface ThreadsEnvelope {
  ok: boolean;
  data?: Page<ThreadSummary>;
  error?: { message?: string };
}

export const useThreadList = defineQuery({
  key: THREADS_QUERY_KEY,

  query: async (): Promise<ThreadSummary[]> => {
    const result = await httpGet<ThreadsEnvelope>('/api/sessions');
    if (!result.ok) throw new Error(result.error.message ?? 'No se pudo leer el historial.');
    return result.data.data?.items ?? [];
  },

  // El historial cambia al terminar una ejecución: se invalida por evento de
  // dominio (`agent:run-finished`), no sondeando.
  staleTime: 30 * 1000,
});
