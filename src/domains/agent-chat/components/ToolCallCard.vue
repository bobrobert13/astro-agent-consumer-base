<script setup lang="ts">
/**
 * @file src/domains/agent-chat/components/ToolCallCard.vue
 * @description Tarjeta de una herramienta invocada durante la ejecución.
 *
 * Se carga con `defineAsyncComponent` desde `ChatMessage.vue`: en la mayoría de
 * las respuestas no hay tool-calls, y su DOM (con el JSON formateado) no debe
 * estar en el chunk inicial del transcript.
 *
 * `args` y `result` se muestran como texto plano dentro de `<pre>`: nunca con
 * `v-html`, por el mismo motivo que en `MarkdownBlock`.
 */
import { computed, ref } from 'vue';

const props = defineProps<{ toolName: string; args: unknown }>();

const open = ref(false);

const preview = computed(() => {
  try {
    return JSON.stringify(props.args ?? null, null, 2) ?? '—';
  } catch {
    // Un args con referencias circulares no debe tumbar el transcript.
    return '[no serializable]';
  }
});
</script>

<template>
  <div class="not-prose my-2 rounded-panel border border-line bg-elevated text-xs">
    <button
      type="button"
      class="flex w-full items-center gap-2 px-3 py-2 text-left"
      :aria-expanded="open"
      @click="open = !open"
    >
      <span class="font-mono text-brand-600">{{ toolName }}</span>
      <span class="ml-auto text-ink-muted">{{ open ? 'ocultar' : 'ver argumentos' }}</span>
    </button>
    <pre v-if="open" class="max-h-60 overflow-auto border-t border-line px-3 py-2 font-mono text-[0.6875rem]">{{ preview }}</pre>
  </div>
</template>
