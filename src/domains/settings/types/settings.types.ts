/**
 * @file src/domains/settings/types/settings.types.ts
 * @description Vocabulario del panel de configuración.
 *
 * Es corto a propósito: una preferencia es una lista de opciones y un valor, y
 * mientras los ajustes sean de interfaz no hay más forma que describir. El día que
 * haya preferencias por cuenta o por agente, su contrato llega aquí.
 */
import type { Component } from 'vue';

import type { ShellTheme } from '@stores/app-shell';

/** Una opción de un ajuste: lo que se guarda y lo que se lee. */
export interface SettingOption {
  id: string;
  label: string;
}

/** El tema, además, con su glifo: es el único ajuste segmentado del panel. */
export interface ThemeOption extends SettingOption {
  id: ShellTheme;
  icon: Component;
}

/**
 * Las preferencias de chat del panel. Son **de ejemplo**: el tema se aplica de
 * verdad contra el store, y estas tres todavía no llegan a la conversación (por eso
 * el panel lo dice en su primera línea).
 */
export interface ChatPreferences {
  agentId: string;
  modelId: string;
  sendOnEnter: boolean;
}
