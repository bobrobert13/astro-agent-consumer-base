<script setup lang="ts">
/**
 * @file src/domains/connectors/views/PendingPanel.vue
 * @description Hueco de las secciones que aún no tienen contenido.
 *
 * Existe porque el repositorio tiene una regla para los esqueletos: **avisan, no
 * callan**. Una pestaña que se abre en blanco se lee como una app rota, así que
 * este panel deja el sitio preparado y dice qué falta, con la misma forma que
 * tendrá el contenido real. Desaparece cuando cada sección tenga su vista.
 */
import type { Component } from 'vue';

interface Props {
  /** Glifo de la sección, el mismo que el de su pestaña. */
  icon: Component;
  title: string;
  body: string;
}

const props = defineProps<Props>();
</script>

<template>
  <section
    :aria-label="props.title"
    class="flex flex-col items-center gap-3 rounded-panel border border-dashed border-line px-6 py-14 text-center"
  >
    <span class="grid size-11 place-items-center rounded-full bg-elevated text-ink-muted">
      <component :is="props.icon" class="size-5" aria-hidden="true" />
    </span>
    <strong class="text-title-sm">{{ props.title }}</strong>
    <p class="max-w-prose text-body-sm text-ink-muted">{{ props.body }}</p>
  </section>
</template>
