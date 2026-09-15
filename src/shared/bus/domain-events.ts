/**
 * @file src/shared/bus/domain-events.ts
 * @description Bus tipado para señales momentáneas entre bounded contexts.
 *
 * Reglas del bus, que son las que evitan que se convierta en un store disfrazado:
 *  - Solo **eventos** (`agent:run-finished`), nunca comandos (`renameSession`).
 *  - Solo estado **momentáneo**: lo que no se puede volver a consultar. Si algo
 *    necesita leerse después, es la URL o un store.
 *  - Nada de estado en el `payload` que otra isla necesite para reconstruirse.
 *
 * Usa `EventTarget` nativo (existe en Node 22 y en el Chromium de Electron) en
 * lugar de una librería de eventos: ya trae `addEventListener` con retorno de
 * cierre y no hay que re-implementar el tipado de `on/off`.
 */

/**
 * Mapa de eventos del dominio. Amplíenlo desde cada slice con
 * `declare module` si publican eventos propios, en vez de abrir este archivo.
 */
export interface DomainEventMap {
  'agent:run-started': { agentId: string; threadId: string };
  'agent:run-finished': { agentId: string; threadId: string; ok: boolean };
  'session:renamed': { threadId: string; title: string };
  'session:deleted': { threadId: string };
  'toast:show': { message: string; tone?: 'info' | 'success' | 'danger' };
  'desktop:shortcut': { id: string };
}

const bus = new EventTarget();

type EventName = keyof DomainEventMap;

/** Publica un evento de dominio. Ignora si el payload no cabe en el contrato. */
export function emitDomainEvent<T extends EventName>(type: T, detail: DomainEventMap[T]): void {
  bus.dispatchEvent(new CustomEvent<DomainEventMap[T]>(type, { detail }));
}

/**
 * Se suscribe. Devuelve la función de cierre, pensada para
 * `onScopeDispose()` / `onUnmounted()` de un composable.
 */
export function onDomainEvent<T extends EventName>(
  type: T,
  handler: (detail: DomainEventMap[T]) => void
): () => void {
  const listener = (event: Event): void => {
    handler((event as CustomEvent<DomainEventMap[T]>).detail);
  };
  bus.addEventListener(type, listener);
  return () => bus.removeEventListener(type, listener);
}
