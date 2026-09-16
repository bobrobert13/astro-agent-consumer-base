import { computed, ref } from 'vue';

import { resultError, type Result } from '@shared/result/result.pattern';
import { DEFAULT_AGENT_SETTINGS, type AgentRunSettings } from '../types/agent-config.types';
import { readAgentConfig, writeAgentConfig } from './services/config/config.api';
import { CONFIG_ERROR_CODES, resolveConfigErrorMessage } from './services/config/config.e';

/**
 * @file src/domains/agent-config/composables/useAgentConfig.ts
 * @description Estado del formulario de configuración: carga, edición, guardado.
 *
 * Composable de isla, no compartido: esta pantalla tiene un solo dueño, y envolverlo
 * en `createSharedComposable` sería estado global "por si acaso" (el disparador está
 * en `AGENTS.md`).
 *
 * Dos detalles que evitan bugs de esta clase de formulario:
 *  - `saved` guarda lo que confirmó el servidor, y `dirty` se calcula contra él. Así
 *    un valor tecleado que el BFF redondea no deja el formulario marcado de sucio
 *    para siempre.
 *  - Si la carga falla se muestran los defaults, pero el formulario queda **no
 *    guardable**: escribir sobre defaults que no se leyeron sobrescribiría la config
 *    real del agente con valores inventados.
 */
export type ConfigState = 'idle' | 'loading' | 'ready' | 'saving' | 'error';

export function useAgentConfig() {
  const agentId = ref('');
  const settings = ref<AgentRunSettings>({ ...DEFAULT_AGENT_SETTINGS });
  const saved = ref<AgentRunSettings>({ ...DEFAULT_AGENT_SETTINGS });
  const state = ref<ConfigState>('idle');
  const message = ref<string | undefined>(undefined);
  const canSave = ref(false);

  const temperature = computed({
    get: () => settings.value.temperature,
    set: (value: number) => {
      settings.value = { ...settings.value, temperature: value };
    },
  });

  const memoryEnabled = computed({
    get: () => settings.value.memoryEnabled,
    set: (value: boolean) => {
      settings.value = { ...settings.value, memoryEnabled: value };
    },
  });

  const model = computed({
    get: () => settings.value.model,
    set: (value: string) => {
      settings.value = { ...settings.value, model: value };
    },
  });

  const dirty = computed(
    () =>
      canSave.value &&
      (settings.value.model !== saved.value.model ||
        settings.value.temperature !== saved.value.temperature ||
        settings.value.memoryEnabled !== saved.value.memoryEnabled)
  );

  const busy = computed(() => state.value === 'loading' || state.value === 'saving');

  async function load(nextAgentId: string): Promise<void> {
    if (nextAgentId === '') return;
    agentId.value = nextAgentId;
    state.value = 'loading';
    message.value = undefined;

    const result = await readAgentConfig(nextAgentId);
    if (!result.ok) {
      settings.value = { ...DEFAULT_AGENT_SETTINGS };
      saved.value = { ...DEFAULT_AGENT_SETTINGS };
      canSave.value = false;
      state.value = 'error';
      message.value = resolveConfigErrorMessage(result.error);
      return;
    }

    settings.value = { ...result.data };
    saved.value = { ...result.data };
    canSave.value = true;
    state.value = 'ready';
  }

  async function save(): Promise<Result<AgentRunSettings>> {
    if (!canSave.value || agentId.value === '') {
      return resultError<AgentRunSettings>({
        statusCode: 409,
        code: CONFIG_ERROR_CODES.loadFailed,
        message: 'No hay una configuración leída que guardar.',
      });
    }

    state.value = 'saving';
    message.value = undefined;
    const result = await writeAgentConfig(agentId.value, settings.value);

    if (!result.ok) {
      state.value = 'error';
      message.value = resolveConfigErrorMessage(result.error);
      return result;
    }

    settings.value = { ...result.data };
    saved.value = { ...result.data };
    state.value = 'ready';
    return result;
  }

  function revert(): void {
    settings.value = { ...saved.value };
    message.value = undefined;
    if (state.value === 'error') state.value = 'ready';
  }

  return {
    agentId,
    settings,
    state,
    message,
    dirty,
    busy,
    canSave,
    model,
    temperature,
    memoryEnabled,
    load,
    save,
    revert,
  };
}
