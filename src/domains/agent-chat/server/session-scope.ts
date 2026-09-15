/**
 * @file src/domains/agent-chat/server/session-scope.ts
 * @description Identidad de la memoria, derivada **en el servidor**.
 *
 * El backend de agentes guarda el historial por `(resource, thread)`. Si el
 * `resource` viniera del body del cliente, cualquiera podría leer el historial
 * de otro poniendo su id en el JSON. Por eso:
 *  - `resource` lo decide este módulo y manda sobre lo que el cliente envíe.
 *  - `thread` sí lo aporta el cliente: es el identificador de la conversación,
 *    que ya conoce por la URL.
 *
 * Cuando exista login, el único archivo que cambia es este.
 */
const ANONYMOUS_RESOURCE = 'anonymous';

export interface SessionScope {
  resource: string;
  thread: string;
}

/**
 * Id de identidad estable por navegador/sesión mientras no haya login.
 *
 * Se toma de una cookie propia, no de `localStorage`: el relay también corre en
 * Node y necesita el mismo valor. Se reemplaza por el id de usuario autenticado
 * en cuanto exista sesión real.
 */
export function resolveScope(request: Request, requestedThread?: string | undefined): SessionScope {
  return {
    resource: resourceFromCookies(request),
    thread: sanitizeThread(requestedThread),
  };
}

/**
 * Id de hilo: sin separadores de ruta, sin puntos iniciales, con techo de
 * longitud. Los `/` se eliminan (no hay traversal posible) y los `.` del inicio
 * también, para que `../x` no llegue como un id que todavía parece relativo al
 * leerse en un log.
 */
export function sanitizeThread(raw: string | undefined | null): string {
  if (raw === undefined || raw === null) return 'nuevo';
  const clean = raw.replace(/[^A-Za-z0-9_.-]/g, '').replace(/^\.+/, '').slice(0, 96);
  return clean === '' ? 'nuevo' : clean;
}

function resourceFromCookies(request: Request): string {
  const cookie = request.headers.get('cookie') ?? '';
  for (const part of cookie.split(';')) {
    const [name, value] = part.trim().split('=');
    if (name === 'aac_resource' && value !== undefined && value !== '') return value.slice(0, 96);
  }
  return ANONYMOUS_RESOURCE;
}

/** Cabecera `Set-Cookie` para fijar el resource la primera vez. */
export function resourceCookie(resource: string): string {
  return `aac_resource=${resource}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000`;
}
