<script setup lang="ts">
/**
 * @file src/domains/chat-studio/components/StudioNav.vue
 * @description Secciones de la navegación lateral.
 *
 * Todas son esqueleto: no hay destinos todavía, así que en vez de dejar botones
 * mudos —que el usuario lee como una app rota— cada una lo dice con un aviso.
 */
import { STUDIO_NAV } from '../data/studio.seed';
import { useStudioShell } from '../composables/useStudioShell';

const { notYet } = useStudioShell();
</script>

<template>
  <nav aria-label="Secciones" class="mt-1.5 flex flex-col gap-1">
    <button
      v-for="item in STUDIO_NAV"
      :key="item.id"
      type="button"
      class="flex h-9 w-full items-center gap-2 rounded-control px-1.5 text-left text-label text-ink transition-colors hover:bg-line/60"
      @click="notYet(item.label)"
    >
      <component :is="item.icon" class="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
      <span class="truncate">{{ item.label }}</span>
    </button>
  </nav>
</template>
