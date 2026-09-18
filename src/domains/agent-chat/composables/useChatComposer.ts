import { computed, ref } from 'vue';

/**
 * @file src/domains/agent-chat/composables/useChatComposer.ts
 * @description Texto en edición y reglas de envío.
 *
 * Vive separado de `useAgentChat` porque es lo único que cambia a 60 Hz mientras
 * se escribe: mantenerlo en el mismo composable que el transcript obligaría a
 * re-evaluar el historial en cada tecla.
 *
 * La lógica de teclas (Enter envía, Shift+Enter salta línea) vive en
 * `StudioComposer.vue` (chat-studio), que es el único sitio donde existe un
 * `KeyboardEvent`:
 * duplicarla aquí "por si acaso" es exactamente la deriva que este slice prohíbe.
 */
export function useChatComposer(options: { disabled?: () => boolean } = {}) {
  const text = ref('');

  const trimmed = computed(() => text.value.trim());
  const canSubmit = computed(() => trimmed.value.length > 0 && (options.disabled?.() ?? false) === false);

  function clear(): void {
    text.value = '';
  }

  return { text, trimmed, canSubmit, clear };
}
