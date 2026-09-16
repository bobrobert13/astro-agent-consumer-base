<script setup lang="ts">
/**
 * @file src/domains/agent-chat/components/ToolCallCard.vue
 * @description Tarjeta de una herramienta invocada durante la ejecución.
 *
 * Se carga con `defineAsyncComponent` desde `ChatMessage.vue`: en la mayoría de
 * las respuestas no hay tool-calls, y su DOM (con el JSON formateado) no debe
 * estar en el chunk inicial del transcript.
 *
 * El desplegable es el `Collapsible` del registry en vez de un `<button>` con un
 * `v-if`: reka-ui pone `aria-expanded`, `aria-controls` y el atributo `hidden`
 * del panel, y con el botón a mano había que acordarse de los tres.
 *
 * `args` se muestra como texto plano dentro de `<pre>`: nunca con `v-html`, por
 * el mismo motivo que en `MarkdownBlock` — un tool-result es entrada no confiable.
 */
import { computed, ref } from 'vue';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

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
  <Collapsible v-model:open="open" class="not-prose my-2 rounded-panel border border-line bg-elevated">
    <CollapsibleTrigger class="flex w-full items-center gap-2 px-3 py-2 text-left text-caption">
      <span class="font-mono text-brand-600">{{ toolName }}</span>
      <span class="ml-auto text-ink-muted">{{ open ? 'ocultar' : 'ver argumentos' }}</span>
    </CollapsibleTrigger>
    <CollapsibleContent>
      <pre class="max-h-60 overflow-auto border-t border-line px-3 py-2 text-code">{{ preview }}</pre>
    </CollapsibleContent>
  </Collapsible>
</template>
