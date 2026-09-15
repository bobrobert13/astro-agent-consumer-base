import { AGENT_TRANSPORT } from '@shared/env/client';
import { resultOk } from '@shared/result/result.pattern';
import type { AgentTransport, StreamContext, StreamInput } from './types';
import { mockTransport } from './mock';

/**
 * @file src/domains/agent-chat/transport/index.ts
 * @description Selección de transporte. Diez líneas que aíslan al resto del slice
 * de saber qué proveedor hay detrás.
 *
 * El transporte real se carga **solo** con `await import()`: así `@mastra/client-js`
 * (que arrastra `@mastra/core`) vive en un chunk diferido y no en el bundle
 * inicial de la isla. `npm run verify:bundle` lo comprueba.
 *
 * Con `AGENT_TRANSPORT=mock` el módulo real ni se solicita: no hace falta que el
 * proveedor esté instalado y funcionando para arrancar la app.
 */
export async function resolveTransport(): Promise<AgentTransport> {
  if (AGENT_TRANSPORT === 'mock') return mockTransport;

  const { mastraTransport } = await import('./mastra');
  return mastraTransport;
}

/**
 * Envoltorio que mantiene la firma del contrato aunque la resolución sea
 * asíncrona. Es lo que consumen los composables, para no dispersar `await` por
 * la UI.
 */
export const transport: AgentTransport = {
  stream: (input: StreamInput, context: StreamContext) =>
    resolveTransport().then((resolved) => resolved.stream(input, context)),
  health: () => resolveTransport().then((resolved) => resolved.health()).catch(() => resultOk({ reachable: false, transport: 'mock' as const })),
};
