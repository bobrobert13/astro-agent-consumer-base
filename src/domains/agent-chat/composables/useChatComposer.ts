import { computed, ref } from 'vue';

/**
 * @file src/domains/agent-chat/composables/useChatComposer.ts
 * @description Texto en edición y reglas de envío.
 *
 * Vive separado de `useAgentChat` porque es lo único que cambia a 60 Hz mientras
 * se escribe: mantenerlo en el mismo composable que el transcript obligaría a
 * re-evaluar el historial en cada tecla.
 *
 * Enter envía, Shift+Enter salta línea. Es la convención que la gente ya tiene
 * en cualquier chat, y por eso se implementa aquí y no "por vista".
 */
export function useChatComposer(options: { disabled?: () => boolean } = {}) {
  const text = ref('');

  const trimmed = computed(() => text.value.trim());
  const canSubmit = computed(() => trimmed.value.length > 0 && (options.disabled?.() ?? false) === false);

  function clear(): void {
    text.value = '';
  }

  function set(value: string): void {
    text.value = value;
  }

  /**
   * Devuelve el prompt si corresponde enviarlo, o `undefined` si el evento debe
   * dejarse pasar (Shift+Enter, tecla con mark, composición de IME).
   */
  function onSubmitKeymap(event: KeyboardEvent): string | undefined {
    if (event.isComposing || event.shiftKey || event.key !== 'Enter') return undefined;
    event.preventDefault();
    if (!canSubmit.value) return undefined;
    return trimmed.value;
  }

  return { text, trimmed, canSubmit, clear, set, onSubmitKeymap };
}
