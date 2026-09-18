/**
 * @file src/domains/settings/composables/useSettings.ts
 * @description Estado del panel de configuración: el tema (real) y las preferencias
 * de chat (de ejemplo).
 *
 * **Aquí no hay `provide`/`inject` a diferencia de los otros slices**, y es una
 * decisión: el panel es un solo componente y no tiene descendientes que necesiten
 * este estado. Montar un canal de inyección para un consumidor sería ceremonia sin
 * lector; el día que las secciones se partan en componentes, se añade.
 *
 * **El tema se lee del store, no se copia.** `useAppShellStore` es el dueño —es lo
 * que comparten el rail y el chrome de toda la app—, así que esto devuelve una
 * referencia al suyo y escribe con su `setTheme`. Duplicarlo aquí daría dos verdades
 * y el conmutador del rail se desincronizaría del panel.
 */
import { computed, ref, type ComputedRef, type Ref } from 'vue';

import { useAppShellStore, type ShellTheme } from '@stores/app-shell';

import { DEFAULT_CHAT_PREFERENCES } from '../data/settings.seed';
import type { ChatPreferences } from '../types/settings.types';

export interface SettingsPanelState {
  /** El tema vive en el store: esto es una lectura suya, no una copia. */
  theme: ComputedRef<ShellTheme>;
  setTheme: (theme: ShellTheme) => void;
  /** Preferencias de ejemplo; el panel avisa de que todavía no llegan al chat. */
  chat: Ref<ChatPreferences>;
  setAgent: (agentId: string) => void;
  setModel: (modelId: string) => void;
  setSendOnEnter: (sendOnEnter: boolean) => void;
}

export function useSettings(): SettingsPanelState {
  const appShell = useAppShellStore();
  const chat = ref<ChatPreferences>({ ...DEFAULT_CHAT_PREFERENCES });

  function setAgent(agentId: string): void {
    chat.value = { ...chat.value, agentId };
  }

  function setModel(modelId: string): void {
    chat.value = { ...chat.value, modelId };
  }

  function setSendOnEnter(sendOnEnter: boolean): void {
    chat.value = { ...chat.value, sendOnEnter };
  }

  return {
    theme: computed(() => appShell.theme),
    setTheme: appShell.setTheme,
    chat,
    setAgent,
    setModel,
    setSendOnEnter,
  };
}
