/**
 * @file src/config/routes.ts
 * @description Constructores de rutas internas.
 *
 * No hay router propio ni vue-router: la URL es el contrato entre vistas (ver
 * `AGENTS.md`), y este archivo es lo que evita que el literal `'/chat/' + id`
 * aparezca en doce componentes.
 *
 * Tres rutas: `/` (estado vacío prerenderizado), `/chat/<hilo>` (conversación con
 * el hilo en la ruta) y `/conectores` (fuentes externas, conocimiento y
 * plantillas). El catálogo de agentes, el historial y los ajustes desaparecieron
 * con sus slices; cuando vuelvan, vuelven aquí primero.
 */
import { NEW_THREAD_ID } from './app';

/**
 * Lo que viaja a la vista de conectores. Los nombres de las claves son los del
 * `?param=` de la URL, que es lo que lee `pages/conectores.astro`; cambiarlos es
 * romper un enlace compartido.
 */
export interface ConnectorsRouteOptions {
  /** Pestaña destino. Los valores válidos los fija `ConnectorTab`. */
  tab?: string | undefined;
  /** Hilo vivo del estudio, para que la isla no se reinicie al abrir la capa. */
  hilo?: string | undefined;
  /** Agente vivo, por el mismo motivo. */
  agente?: string | undefined;
  /** Ruta interna a la que vuelve la capa al cerrarse. */
  volver?: string | undefined;
}

/** Añade a la ruta solo lo que existe: una query con `undefined` no se escribe. */
function withQuery(path: string, entries: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(entries)) {
    if (value !== undefined && value !== '') params.set(key, value);
  }
  const query = params.toString();
  return query === '' ? path : `${path}?${query}`;
}

export const routes = {
  home: (): string => '/',
  chat: (threadId: string = NEW_THREAD_ID): string => `/chat/${threadId}`,
  connectors: (options: ConnectorsRouteOptions = {}): string =>
    withQuery('/conectores', {
      pestana: options.tab,
      hilo: options.hilo,
      agente: options.agente,
      volver: options.volver,
    }),
} as const;

export type RouteKey = keyof typeof routes;
