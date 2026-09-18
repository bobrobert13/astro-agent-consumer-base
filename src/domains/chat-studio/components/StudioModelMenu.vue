<script setup lang="ts">
/**
 * @file src/domains/chat-studio/components/StudioModelMenu.vue
 * @description Selector de modelo de la cabecera.
 *
 * Es esqueleto: cambiar de modelo no altera ninguna ejecución todavía. Usa el
 * grupo de opciones del registry (y no una lista desplegable propia) porque el
 * disparador es un botón con etiqueta y flecha, que es exactamente su forma, y
 * así la navegación por teclado y el foco los pone reka-ui.
 */
import { ChevronsUpDown } from '@lucide/vue';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@components/ui/dropdown-menu';
import { useStudioShell } from '../composables/useStudioShell';
import { STUDIO_MODELS } from '../data/studio.seed';

const { model, setModel } = useStudioShell();

/** reka-ui entrega el valor sin tipar; el modelo se busca por id, no se castea. */
function onPick(value: unknown): void {
  const next = STUDIO_MODELS.find((entry) => entry.id === value);
  if (next !== undefined) setModel(next);
}
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <button
        type="button"
        class="-ml-2.5 flex min-w-0 items-center gap-1.5 rounded-control px-2.5 py-1.5 text-title-sm text-ink transition-colors hover:bg-line/60"
      >
        <span class="truncate">{{ model.label }}</span>
        <ChevronsUpDown class="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
      </button>
    </DropdownMenuTrigger>

    <DropdownMenuContent align="start" class="w-56">
      <DropdownMenuRadioGroup :model-value="model.id" @update:model-value="onPick">
        <DropdownMenuRadioItem v-for="entry in STUDIO_MODELS" :key="entry.id" :value="entry.id">
          <span>{{ entry.label }}</span>
          <span
            v-if="entry.tag !== undefined"
            class="ml-auto rounded-sm bg-brand-050 px-1.5 py-0.5 text-caption font-semibold text-brand-600"
          >
            {{ entry.tag }}
          </span>
        </DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
