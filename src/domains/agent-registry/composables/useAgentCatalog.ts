import { defineQuery } from '@pinia/colada';

import { httpGet } from '@shared/http/http-client';
import type { AgentSummary } from '../types/agent.types';

/**
 * @file src/domains/agent-registry/composables/useAgentCatalog.ts
 * @description Catálogo de agentes cacheado con `@pinia/colada`.
 *
 * Por qué colada aquí y no en todos los servicios: es una lectura consumida por
 * varias vistas (selector de agente, página de catálogo, cabecera del chat) y con
 * semántica de frescura real — el catálogo cambia cuando el backend despliega
 * agentes nuevos, no cada vez que se navega.
 *
 * Ojo con la doble envoltura: `httpGet` devuelve `Result<T>` (éxito/fallo de la
 * llamada) y el BFF envuelve además en `{ ok, data }` (formato del contrato
 * propio). Desembricar las dos es lo que hace el `result.data.data`.
 *
 * Regla dura de `AGENTS.md`: `useQuery` solo dentro de una isla hidratada; el
 * plugin de colada se instala por `appEntrypoint` en el cliente.
 */
export const AGENTS_QUERY_KEY = ['agent-registry', 'catalog'] as const;

interface AgentsEnvelope {
  ok: boolean;
  data?: AgentSummary[];
  error?: { message?: string };
}

export const useAgentCatalog = defineQuery({
  key: AGENTS_QUERY_KEY,

  query: async (): Promise<AgentSummary[]> => {
    const result = await httpGet<AgentsEnvelope>('/api/agents');
    if (!result.ok) throw new Error(result.error.message ?? 'No se pudo leer el catálogo.');
    return result.data.data ?? [];
  },

  // 5 minutos: el catálogo es estable durante una sesión de trabajo.
  staleTime: 5 * 60 * 1000,
});
