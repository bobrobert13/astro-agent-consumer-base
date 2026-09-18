/**
 * @file src/domains/settings/data/settings.seed.ts
 * @description Opciones y copy del panel de configuración, en un solo módulo.
 *
 * **Qué es real y qué no.** El tema lo es: se aplica contra el store global en el
 * momento. El agente, el modelo y el envío con Enter son de ejemplo y no llegan a la
 * conversación, así que el panel lo dice en su primera línea en vez de dejar tres
 * controles que parecen hacer algo.
 *
 * **Los catálogos se copian, y eso es deuda declarada.** Las cuatro cuentas de
 * agente son las reales del backend (ver `AGENTS.md` raíz) y los tres modelos son
 * los del simulacro del estudio. Cuando la preferencia sea de verdad, esto tiene que
 * **leer el catálogo de su dueño** —el estudio para los modelos, el BFF para los
 * agentes— en lugar de copiarlo, o tendremos dos listas que se desincronizan.
 */
import { Monitor, Moon, Sun } from '@lucide/vue';

import { DEFAULT_AGENT_ID } from '@config/app';
import type { ChatPreferences, SettingOption, ThemeOption } from '../types/settings.types';

/** Los tres estados del tema, con su glifo. Es la fuente única: el menú del rail los
 *  lee de aquí para no tener dos listas de lo mismo. */
export const THEME_OPTIONS: ThemeOption[] = [
  { id: 'light', label: 'Claro', icon: Sun },
  { id: 'dark', label: 'Oscuro', icon: Moon },
  { id: 'system', label: 'Sistema', icon: Monitor },
];

/** Los agentes del backend, con su nombre de producto. */
export const AGENT_OPTIONS: SettingOption[] = [
  { id: 'communication-agent', label: 'Comunicación general' },
  { id: 'research-agent', label: 'Investigación' },
  { id: 'tasks-agent', label: 'Tareas' },
  { id: 'files-agent', label: 'Archivos' },
];

/** Los modelos del simulacro del estudio. */
export const MODEL_OPTIONS: SettingOption[] = [
  { id: 'base', label: 'Modelo base' },
  { id: 'lite', label: 'Modelo ligero' },
  { id: 'pro', label: 'Modelo avanzado' },
];

/**
 * Con lo que arranca el panel. El agente sale del default real del producto
 * (`@config/app`), el modelo del que ofrece la cabecera y Enter envía porque es lo
 * que hace el composer hoy: si estos valores no coincidieran con la realidad, el
 * panel estaría mintiendo sobre el estado de partida.
 */
export const DEFAULT_CHAT_PREFERENCES: ChatPreferences = {
  agentId: DEFAULT_AGENT_ID,
  modelId: 'base',
  sendOnEnter: true,
};

/** Textos del panel. */
export const SETTINGS_COPY = {
  title: 'Configuración',
  close: 'Cerrar configuración',
  note: 'El tema se aplica al instante. El agente, el modelo y el envío con Enter son de ejemplo: todavía no llegan a la conversación.',
  appearance: 'Apariencia',
  themeLabel: 'Tema',
  chat: 'Chat',
  agent: 'Agente por defecto',
  model: 'Modelo por defecto',
  sendOnEnter: 'Enviar con Enter',
} as const;
