<script setup lang="ts">
/**
 * @file src/domains/chat-studio/components/StudioMarkdown.vue
 * @description Renderiza el texto del agente **sin `v-html`**.
 *
 * Decisión de seguridad, no de gusto: el contenido de un agente es entrada no
 * confiable (puede ecoear HTML de una web que rastreó, o de un tool-result). Un
 * `v-html` con DOMPurify mal configurado, o sin él, es XSS directo en la isla.
 * Aquí se construyen nodos con el template de Vue, que escapa por defecto.
 *
 * Cobertura intencional de "markdown": párrafos, bloques de código y código en
 * línea. Es lo que sale en una conversación. Si un producto necesita tablas u
 * HTML enriquecido, se añade un renderizador con sanitización demostrable y su
 * test, no se cambia este archivo a `v-html`.
 */
import { computed } from 'vue';

const props = defineProps<{ text: string }>();

interface Block {
  kind: 'paragraph' | 'code';
  text: string;
  lang?: string | undefined;
}

const blocks = computed<Block[]>(() => {
  const out: Block[] = [];
  const lines = props.text.split('\n');
  let buffer: string[] = [];
  let inCode = false;
  let lang: string | undefined;

  const flushParagraph = (): void => {
    if (buffer.length === 0) return;
    out.push({ kind: 'paragraph', text: buffer.join('\n') });
    buffer = [];
  };

  for (const line of lines) {
    const fence = /^```([A-Za-z0-9+-]*)\s*$/.exec(line);
    if (fence !== null) {
      if (inCode) {
        out.push({ kind: 'code', text: buffer.join('\n'), ...(lang !== undefined && lang !== '' ? { lang } : {}) });
        buffer = [];
        inCode = false;
        lang = undefined;
      } else {
        flushParagraph();
        inCode = true;
        lang = fence[1];
      }
      continue;
    }
    buffer.push(line);
  }

  if (inCode) {
    out.push({ kind: 'code', text: buffer.join('\n'), ...(lang !== undefined && lang !== '' ? { lang } : {}) });
  } else {
    flushParagraph();
  }

  return out;
});
</script>

<template>
  <div class="prose prose-sm max-w-none dark:prose-invert">
    <template v-for="(block, index) in blocks" :key="index">
      <pre
        v-if="block.kind === 'code'"
        class="overflow-x-auto rounded-panel border border-line bg-surface p-3 text-code not-prose"
      ><code>{{ block.text }}</code></pre>
      <p v-else class="whitespace-pre-wrap text-body-sm">{{ block.text }}</p>
    </template>
  </div>
</template>
