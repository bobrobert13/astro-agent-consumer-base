import type { WireMessage } from './adapt-ui-messages';

/**
 * @file src/domains/agent-chat/ai/chat.scope.ts
 * @description Qué agente y qué hilo recibe cada envío, y cómo se extrae el
 * mensaje que viaja al backend.
 *
 * Vive aparte de los transportes para que el real y el simulado compartan la
 * definición sin importarse entre sí: el transporte se elige en un módulo que
 * conoce a los dos, y una dependencia cruzada entre ellos sería un ciclo.
 */

/** Alcance de una ejecución. */
export interface ChatScope {
  agentId: string;
  thread: string;
}

/**
 * Se lee **en el momento del envío**, no al construir el transporte.
 *
 * Es lo que permite que haya un solo transporte para toda la sesión: cambiar de
 * agente o de hilo no lo recrea, solo cambia lo que devuelve este getter.
 */
export type ScopeGetter = () => ChatScope;

/**
 * Último mensaje del usuario de la lista: lo único que viaja al backend.
 *
 * La memoria del hilo la carga Mastra en el servidor, así que reenviar el
 * historial sería redundante y puede desordenar la conversación (los timestamps
 * del cliente compiten con los que el backend ya guardó). Se busca el último
 * **del usuario** y no el último a secas porque en un `regenerate` la lista
 * termina en el mensaje del asistente que se rehace.
 */
export function lastUserMessage(messages: readonly WireMessage[]): WireMessage | undefined {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role === 'user') return message;
  }
  return undefined;
}
