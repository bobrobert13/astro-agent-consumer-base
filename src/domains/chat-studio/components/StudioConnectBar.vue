<script setup lang="ts">
/**
 * @file src/domains/chat-studio/components/StudioConnectBar.vue
 * @description Franja pegada al composer que invita a conectar fuentes externas.
 *
 * Es la puerta principal al panel de conectores: lo abre en la sección de fuentes
 * **sin salir del estudio** —el chat sigue detrás, escribible—. Lo que sigue siendo
 * de relleno son los datos del panel, y de eso informa él mismo. Se dibuja pegada a
 * la caja del composer (sin borde superior y con el radio inferior) porque en la
 * plantilla las dos forman un solo bloque.
 *
 * Los avatares de la plantilla eran retratos; aquí son puntos con el token de
 * marca en distintas opacidades, que dan el mismo ritmo sin inventar imágenes.
 */
import { ChevronRight } from '@lucide/vue';

import { useStudioShell } from '../composables/useStudioShell';
import { STUDIO_COPY } from '../data/studio.seed';

const { openConnectors } = useStudioShell();

const DOTS = [
  'bg-brand-500',
  'bg-brand-500/75',
  'bg-brand-500/55',
  'bg-brand-600/40',
  'bg-ink-muted/30',
] as const;
</script>

<template>
  <button
    type="button"
    class="-mt-px flex w-full items-center justify-between gap-4 rounded-b-shell border border-line bg-elevated px-6 py-3 text-left text-body-sm text-ink-muted transition-colors hover:bg-line/40"
    @click="openConnectors('fuentes')"
  >
    <span class="truncate">{{ STUDIO_COPY.connectBar }}</span>

    <span class="flex shrink-0 items-center gap-2">
      <span class="flex" aria-hidden="true">
        <i
          v-for="(dot, index) in DOTS"
          :key="dot"
          class="size-5 rounded-full border border-elevated"
          :class="[dot, index > 0 ? '-ml-1.5' : '']"
        />
      </span>
      <ChevronRight class="size-4" aria-hidden="true" />
    </span>
  </button>
</template>
