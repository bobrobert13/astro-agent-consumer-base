<script setup lang="ts">
/**
 * @file src/domains/chat-studio/components/StudioSourceRow.vue
 * @description Una fila de fuente: la referencia que el agente usó y por qué.
 *
 * El "favicon" es la inicial del dominio sobre el token de marca, como en la
 * plantilla: sin red, sin imágenes y sin depender de un servicio de iconos.
 */
import { computed } from 'vue';

import { useStudioShell } from '../composables/useStudioShell';
import type { SourceRow } from '../types/studio.types';

const props = defineProps<{ source: SourceRow }>();

const { notYet } = useStudioShell();

const initial = computed(() => props.source.domain.slice(0, 1));
const isSession = computed(() => props.source.scope === 'session');
</script>

<template>
  <button
    type="button"
    class="flex w-full gap-3 rounded-panel border border-line bg-surface p-2.5 text-left transition-colors hover:border-brand-500/40 hover:bg-elevated"
    @click="notYet('Abrir fuente')"
  >
    <span
      class="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-brand-500 text-caption font-semibold text-on-brand uppercase"
      aria-hidden="true"
    >
      {{ initial }}
    </span>

    <span class="flex min-w-0 flex-1 flex-col">
      <span class="flex items-center gap-2">
        <strong class="min-w-0 flex-1 truncate text-label font-semibold text-ink">{{ props.source.title }}</strong>
        <span
          class="shrink-0 rounded-sm px-1.5 py-0.5 text-caption font-semibold uppercase"
          :class="
            isSession
              ? 'bg-elevated text-ink-muted'
              : 'bg-brand-050 text-brand-600'
          "
        >
          {{ isSession ? 'sesión' : 'interacción' }}
        </span>
      </span>

      <span class="mt-0.5 mb-1 truncate text-caption text-brand-600">{{ props.source.domain }}</span>
      <span class="line-clamp-2 text-caption text-ink-muted">{{ props.source.snippet }}</span>
      <span class="mt-1.5 text-caption text-ink-muted">{{ props.source.usedAt }}</span>
    </span>
  </button>
</template>
