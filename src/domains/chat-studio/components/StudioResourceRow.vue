<script setup lang="ts">
/**
 * @file src/domains/chat-studio/components/StudioResourceRow.vue
 * @description Una fila de recurso del panel de contexto.
 *
 * El tono de cada tipo vive **aquí y no en el dato**: el contrato (`ResourceRow`)
 * describe qué es un recurso, no cómo se pinta. Así añadir un tipo nuevo es una
 * entrada en el mapa y una en `RESOURCE_ICONS`, sin tocar la semilla.
 */
import { ChevronRight } from '@lucide/vue';

import { RESOURCE_ICONS } from '../data/studio.seed';
import type { ResourceKind, ResourceRow } from '../types/studio.types';

const props = defineProps<{ resource: ResourceRow }>();

const emit = defineEmits<{ open: [resource: ResourceRow] }>();

/**
 * Fondo y tinta por tipo, con los tokens de concepto: el mismo mapa sirve en claro
 * y en oscuro porque el tema los reasigna. Un `#hex` por tipo habría que
 * duplicarlo para el modo oscuro.
 */
const TILE: Record<ResourceKind, string> = {
  image: 'bg-elevated text-ink-muted',
  pdf: 'bg-danger/10 text-danger',
  doc: 'bg-brand-050 text-brand-600',
  sheet: 'bg-warning/15 text-ink',
  link: 'bg-brand-500/10 text-brand-600',
  audio: 'bg-elevated text-ink-muted',
};
</script>

<template>
  <button
    type="button"
    class="flex w-full items-center gap-3 rounded-panel border border-line bg-surface p-2.5 text-left transition-colors hover:border-brand-500/40 hover:bg-elevated"
    @click="emit('open', props.resource)"
  >
    <span class="grid size-10 shrink-0 place-items-center rounded-control" :class="TILE[props.resource.kind]">
      <component :is="RESOURCE_ICONS[props.resource.kind]" class="size-4.5" aria-hidden="true" />
    </span>

    <span class="flex min-w-0 flex-1 flex-col gap-0.5">
      <strong class="truncate text-label font-semibold text-ink">{{ props.resource.name }}</strong>
      <small class="truncate">{{ props.resource.meta }}</small>
    </span>

    <ChevronRight class="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
  </button>
</template>
