<script setup lang="ts">
/**
 * @file src/domains/chat-studio/components/StudioSuggestions.vue
 * @description Tarjetas del estado vacío. Al pulsar una, el texto se escribe en
 * el composer en vez de enviarse: el usuario decide si la completa o la manda
 * tal cual.
 *
 * Son `<button>` con `<span>` dentro y no con `<h3>`/`<p>` como la plantilla: un
 * `button` solo admite contenido de frase, y meterle un párrafo es HTML inválido
 * —lo que el compilador de Astro 7 ya no corrige—. Las clases dan el mismo
 * aspecto sin la infracción.
 */
import { STUDIO_SUGGESTIONS } from '../data/studio.seed';

const emit = defineEmits<{ pick: [prompt: string] }>();
</script>

<template>
  <div class="grid w-full grid-cols-1 gap-4 nav:grid-cols-3">
    <button
      v-for="card in STUDIO_SUGGESTIONS"
      :key="card.id"
      type="button"
      class="flex min-h-30 flex-col items-start gap-2.5 rounded-panel border border-line bg-elevated p-4 text-left transition-all hover:-translate-y-px hover:border-brand-500/40 hover:bg-surface hover:shadow-sm"
      @click="emit('pick', card.prompt)"
    >
      <component :is="card.icon" class="size-5 shrink-0 text-ink" aria-hidden="true" />
      <span class="text-title-sm text-ink">{{ card.title }}</span>
      <span class="text-caption text-ink-muted">{{ card.description }}</span>
    </button>
  </div>
</template>
