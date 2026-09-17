/**
 * @file src/domains/agent-chat/server/session-scope.ts
 * @description Identidad de la memoria, derivada **en el servidor**.
 *
 * El backend de agentes guarda el historial por `(resource, thread)`. Si el
 * `resource` viniera del body del cliente, cualquiera podría leer el historial de
 * otro poniendo su id en el JSON. Por eso:
 *  - `resource` lo decide este módulo y manda sobre lo que el cliente envíe.
 *  - `thread` sí lo aporta el cliente: es el identificador de la conversación, que
 *    ya conoce por la URL. Pero se acota aquí SIEMPRE al resource (ver
 *    `scopeThread`), porque Mastra ata cada hilo a un resource y reusarlo con
 *    otro dueño es un 500.
 *
 * Cuando exista login, el único archivo que cambia es este.
 *
 * **Por qué se emite la cookie aquí**: hasta ahora este módulo nunca asignaba
 * identidad — sin cookie devolvía la constante `'anonymous'` para todo el mundo,
 * así que la regla del párrafo anterior se cumplía en la forma pero no en el
 * efecto (todos los navegadores compartían memoria). Ahora, si no hay cookie, se
 * acuña una y se devuelve su `Set-Cookie` para que el llamador la emita. La
 * carrera del primerísimo par de peticiones simultáneas (cada una acuña la suya y
 * gana la que el navegador guarde) se resuelve sola en la siguiente petición.
 */
import { NEW_THREAD_ID } from '@config/app';

const COOKIE_NAME = 'aac_resource';

export interface SessionScope {
  resource: string;
  thread: string;
  /** `Set-Cookie` a emitir **solo** si la identidad se acaba de acuñar. */
  setCookie: string | undefined;
}

/**
 * Id de identidad estable por navegador/sesión mientras no haya login.
 *
 * Se toma de una cookie propia, no de `localStorage`: el relay también corre en
 * Node y necesita el mismo valor. Se reemplaza por el id de usuario autenticado
 * en cuanto exista sesión real.
 */
export function resolveScope(request: Request, requestedThread?: string | undefined): SessionScope {
  const existing = resourceFromCookies(request);
  const resource = existing ?? mintResource();
  return {
    resource,
    thread: scopeThread(sanitizeThread(requestedThread), resource),
    setCookie: existing === undefined ? resourceCookie(resource) : undefined,
  };
}

/**
 * El hilo se acota SIEMPRE al resource del navegador.
 *
 * `nuevo` es un marcador ("conversación nueva"), pero un id real de la URL
 * (`/chat/mi-hilo`) tenía el mismo defecto latente: si el resource cambiaba
 * —otra cookie, otro navegador, `localhost` vs `127.0.0.1`— el hilo se reusaba
 * con otro dueño y Mastra lo rechazaba con `Thread "…" belongs to resource "…"
 * but "…" was provided` → 500 `Internal Server Error` (verificado contra el
 * backend real). Acotarlo aquí cierra la clase entera: el hilo sigue siendo el
 * mismo para el mismo navegador —la conversación no se pierde entre mensajes—
 * y queda aislado de los demás.
 *
 * El id saneado se recorta a 63 caracteres para que `thread(63) + "-" +
 * resource(32)` no rebase el techo de 96 de `sanitizeThread`.
 */
function scopeThread(thread: string, resource: string): string {
  return `${thread.slice(0, 63)}-${resource}`;
}

/**
 * Id de hilo: sin separadores de ruta, sin puntos iniciales, con techo de
 * longitud. Los `/` se eliminan (no hay traversal posible) y los `.` del inicio
 * también, para que `../x` no llegue como un id que todavía parece relativo al
 * leerse en un log.
 */
export function sanitizeThread(raw: string | undefined | null): string {
  if (raw === undefined || raw === null) return NEW_THREAD_ID;
  const clean = raw.replace(/[^A-Za-z0-9_.-]/g, '').replace(/^\.+/, '').slice(0, 96);
  return clean === '' ? NEW_THREAD_ID : clean;
}

/** Identidad nueva: 32 hex, sin guiones, para que quepa en una cookie corta. */
function mintResource(): string {
  return crypto.randomUUID().replace(/-/g, '');
}

function resourceFromCookies(request: Request): string | undefined {
  const cookie = request.headers.get('cookie') ?? '';
  for (const part of cookie.split(';')) {
    const separator = part.indexOf('=');
    if (separator === -1) continue;
    const name = part.slice(0, separator).trim();
    if (name !== COOKIE_NAME) continue;
    const value = decodeURIComponent(part.slice(separator + 1).trim());
    if (value !== '') return value.slice(0, 96);
  }
  return undefined;
}

/**
 * Cabecera `Set-Cookie` para fijar el resource la primera vez.
 *
 * `HttpOnly` y `SameSite=Lax`, sin `Secure`: no es un descuido. El producto
 * arranca en `http://127.0.0.1` (dev y el shell de Electron empaquetado), y una
 * cookie `Secure` no viaja por HTTP — se perdería la identidad justo en el
 * entorno donde hoy se usa. Cuando haya despliegue sobre TLS, se añade aquí.
 */
export function resourceCookie(resource: string): string {
  return `${COOKIE_NAME}=${encodeURIComponent(resource)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000`;
}
