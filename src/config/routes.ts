/**
 * @file src/config/routes.ts
 * @description Constructores de rutas internas.
 *
 * No hay router propio ni vue-router: la URL es el contrato entre vistas (ver
 * `AGENTS.md`), y este archivo es lo que evita que el literal `'/chat/' + id`
 * aparezca en doce componentes.
 *
 * Solo quedan las dos rutas del estudio: `/` (estado vacío prerenderizado) y
 * `/chat/<hilo>` (conversación con hilo en la URL). El panel de conectores **no**
 * está aquí a propósito: es un panel del estudio, como el de contexto, y se abre
 * con `useStudioShell` sin cambiar de pantalla. El catálogo de agentes, el
 * historial y los ajustes desaparecieron con sus slices; cuando vuelvan, vuelven
 * aquí primero.
 */
import { NEW_THREAD_ID } from './app';

export const routes = {
  home: (): string => '/',
  chat: (threadId: string = NEW_THREAD_ID): string => `/chat/${threadId}`,
} as const;

export type RouteKey = keyof typeof routes;
