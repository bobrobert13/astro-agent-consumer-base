<script setup lang="ts">
/**
 * @file src/domains/chat-studio/components/StudioHero.vue
 * @description Bloque de marca del estado vacío: la píldora de ampliación, el
 * hueco de imagen y el titular.
 *
 * No incluye el composer: el de la plantilla vive aquí dentro, pero en cuanto hay
 * conversación tiene que quedarse abajo, así que la caja de escritura la coloca
 * `StudioPanel` en uno de los dos sitios. Así hay **una sola** instancia del
 * composer en el DOM y el `id="aac-composer"` nunca está duplicado.
 */
import { Sparkles } from '@lucide/vue';

import StudioImageSlot from './StudioImageSlot.vue';
import { useStudioShell } from '../composables/useStudioShell';
import { STUDIO_COPY, STUDIO_IMAGE_SLOTS } from '../data/studio.seed';

const { notYet } = useStudioShell();
</script>

<template>
  <div class="flex w-full flex-col items-center">
    <button
      type="button"
      class="flex max-w-full items-center gap-2 rounded-control border border-line bg-elevated px-4.5 py-2.5 text-label text-ink-muted transition-colors hover:border-brand-500/40 hover:bg-brand-050"
      @click="notYet('Planes')"
    >
      <Sparkles class="size-4 shrink-0 text-brand-500" aria-hidden="true" />
      <span class="truncate">
        <strong class="font-semibold text-brand-600">{{ STUDIO_COPY.heroPillStrong }}</strong>
        {{ STUDIO_COPY.heroPill }}
      </span>
    </button>

    <StudioImageSlot :name="STUDIO_IMAGE_SLOTS.hero" class="mt-9 h-15 w-15 rounded-panel bg-elevated" />

    <h1 class="mt-9 text-center text-hero">{{ STUDIO_COPY.heroTitle }}</h1>
  </div>
</template>
