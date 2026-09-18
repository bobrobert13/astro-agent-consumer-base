/**
 * @file src/domains/chat-studio/composables/useStudioSessions.ts
 * @description Sesiones creadas desde la pantalla: el hilo de "nuevo chat".
 *
 * **Qué resuelve.** "Nuevo chat" era un botón que limpiaba la conversación y
 * devolvía a la raíz: la sesión nueva no existía en ningún sitio —ni en la URL, ni
 * en el historial—, así que no había flujo que probar. Aquí cada pulsación crea
 * una sesión con **hilo propio** y la navegación va a `/chat/<hilo>`, que es el
 * contrato de URL del estudio: una conversación, una dirección.
 *
 * **Es un mock, y se nota a propósito.** No hay backend de historial todavía, así
 * que las sesiones viven en memoria del documento: sobreviven a la navegación
 * —la isla se persiste— y se pierden al recargar. El día que exista lectura real,
 * este composable es el único archivo que cambia; la vista sigue hablando de
 * `HistoryEntry`.
 *
 * Se comparte por módulo (`createSharedComposable`) y no por `provide`: el estado
 * del chrome vive en `useStudioShell`, pero esto es **dato** de la pantalla, y una
 * sesión creada en el rail tiene que ser la misma que lee el historial o la que
 * renombra el composer.
 */
import { createSharedComposable } from '@vueuse/shared';
import { computed, ref, type ComputedRef } from 'vue';

import { STUDIO_HISTORY, STUDIO_COPY } from '../data/studio.seed';
import type { HistoryEntry, HistoryGroup } from '../types/studio.types';

/** Una sesión creada en esta visita. */
interface StudioSession {
  /** Hilo al que apunta: es el segmento de `/chat/<hilo>`. */
  id: string;
  label: string;
  /** Ya tomó el nombre de su primer prompt (o se lo puso la persona). */
  named: boolean;
}

export interface StudioSessions {
  /** El historial de la semilla más las sesiones creadas, agrupado igual. */
  groups: ComputedRef<HistoryGroup[]>;
  /** Crea una sesión nueva y devuelve su hilo, listo para `routes.chat()`. */
  create: () => string;
  /** Nombra la sesión con su primer prompt, si aún no tiene nombre. */
  nameFromPrompt: (threadId: string, prompt: string) => void;
}

/** Tope del nombre en el historial: dos líneas del rail, no una frase. */
const MAX_LABEL = 48;

/** Contador para que dos sesiones del mismo milisegundo no colisionen. */
let sequence = 0;

function newThreadId(): string {
  sequence += 1;
  return `sesion-${Date.now().toString(36)}-${sequence.toString(36)}`;
}

function defineStudioSessions(): StudioSessions {
  const created = ref<StudioSession[]>([]);

  /**
   * La primera entrada de la semilla es "Hoy", que es donde cae una sesión recién
   * creada. Si la semilla cambiara de forma, las creadas siguen teniendo su grupo:
   * se añade uno propio en vez de perderlas.
   */
  const groups = computed<HistoryGroup[]>(() => {
    const [today = { label: 'Hoy', entries: [] }, ...rest] = STUDIO_HISTORY;
    return [
      { ...today, entries: [...created.value.map(toEntry), ...today.entries] },
      ...rest,
    ];
  });

  function toEntry(session: StudioSession): HistoryEntry {
    return { id: session.id, label: session.label, threadId: session.id };
  }

  function create(): string {
    const id = newThreadId();
    created.value = [{ id, label: STUDIO_COPY.newChat, named: false }, ...created.value];
    return id;
  }

  function nameFromPrompt(threadId: string, prompt: string): void {
    const session = created.value.find((entry) => entry.id === threadId);
    if (session === undefined || session.named) return;

    const clean = prompt.replace(/\s+/g, ' ').trim();
    if (clean === '') return;

    session.label = clean.length > MAX_LABEL ? `${clean.slice(0, MAX_LABEL - 1)}…` : clean;
    session.named = true;
  }

  return { groups, create, nameFromPrompt };
}

export const useStudioSessions = createSharedComposable(defineStudioSessions);
