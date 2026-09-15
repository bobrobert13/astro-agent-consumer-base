/**
 * @file src/config/routes.ts
 * @description Constructores de rutas internas.
 *
 * No hay router propio ni vue-router: la URL es el contrato entre slices
 * (ver `AGENTS.md`), y este archivo es lo que evita que el literal
 * `'/chat/' + id` aparezca en doce componentes.
 */
import { NEW_THREAD_ID } from './app';

export const routes = {
  home: (): string => '/',
  chat: (threadId: string = NEW_THREAD_ID): string => `/chat/${threadId}`,
  agents: (): string => '/agents',
  agent: (agentId: string): string => `/agents/${agentId}`,
  history: (): string => '/history',
  settings: (): string => '/settings',
} as const;

export type RouteKey = keyof typeof routes;
