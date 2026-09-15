/**
 * @file src/shared/env/server.ts
 * @description Barril del entorno que SOLO puede existir en el proceso Node.
 *
 * Todo lo que se importa aquí contiene secretos o la URL real del backend de
 * agentes. El test de fronteras (`tests/architecture/boundaries.spec.ts`)
 * revienta si cualquier módulo de cliente lo importa.
 */
export {
  AGENT_CONNECT_TIMEOUT,
  AGENT_IDLE_TIMEOUT,
  MASTRA_API_KEY,
  MASTRA_URL,
} from 'astro:env/server';
