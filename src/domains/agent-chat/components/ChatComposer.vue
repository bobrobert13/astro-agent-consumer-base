<script setup lang="ts">
/**
 * @file src/domains/agent-chat/components/ChatComposer.vue
 * @description Área de texto + envío. Presentacional: no toca el transporte,
 * recibe el estado y emite intenciones.
 *
 * Así el mismo composer sirve para la isla de chat y para una vista de
 * "repetir con otra config" sin duplicar la lógica de teclas.
 */
import { ref, watch, nextTick } from 'vue';

const props = defineProps<{
  text: string;
  canSubmit: boolean;
  disabled: boolean;
  placeholder?: string | undefined;
}>();

const emit = defineEmits<{
  'update:text': [value: string];
  submit: [];
  stop: [];
}>();

const area = ref<HTMLTextAreaElement | null>(null);

/** Autoresize sin librería: el `scrollHeight` manda, con un techo. */
watch(
  () => props.text,
  async () => {
    await nextTick();
    const element = area.value;
    if (element === null) return;
    element.style.height = 'auto';
    element.style.height = `${Math.min(element.scrollHeight, 240)}px`;
  }
);

function onKeydown(event: KeyboardEvent): void {
  // Enter envía; Shift+Enter deja el salto de línea nativo del textarea.
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    if (props.canSubmit) emit('submit');
  }
}
</script>

<template>
  <form
    class="flex items-end gap-2 border-t border-line bg-surface px-4 py-3"
    @submit.prevent="emit('submit')"
  >
    <label class="sr-only" for="aac-composer">Mensaje para el agente</label>
    <textarea
      id="aac-composer"
      ref="area"
      :value="text"
      rows="1"
      :placeholder="placeholder ?? 'Escribe un mensaje…  (/error y /slow simulan fallos)'"
      :disabled="disabled"
      class="max-h-60 min-h-9 flex-1 resize-none rounded-panel border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-brand-500 disabled:opacity-60"
      @input="emit('update:text', ($event.target as HTMLTextAreaElement).value)"
      @keydown="onKeydown"
    >
    </textarea>

    <button
      v-if="disabled"
      type="button"
      class="h-9 shrink-0 rounded-panel border border-danger px-3 text-xs font-medium text-danger"
      @click="emit('stop')"
    >
      Detener
    </button>
    <button
      v-else
      type="submit"
      :disabled="!canSubmit"
      class="h-9 shrink-0 rounded-panel bg-brand-500 px-3.5 text-sm font-medium text-white disabled:opacity-40"
    >
      Enviar
    </button>
  </form>
</template>
