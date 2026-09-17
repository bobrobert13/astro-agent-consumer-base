<script setup lang="ts">
/**
 * @file src/domains/chat-studio/components/StudioComposerTools.vue
 * @description Botones de herramienta del composer (adjuntar, buscar, voz…).
 *
 * Presentacional y sin estado: recibe la lista y avisa de cuál se pulsó. Quién
 * decide qué hace cada herramienta es el composer, no este componente.
 *
 * Cada botón va envuelto en su `Tooltip` porque su etiqueta es solo un icono: el
 * `aria-label` cubre al lector de pantalla y el tooltip al resto. El
 * `TooltipProvider` que reka-ui necesita está montado una vez en `ChatStudio`.
 */
import { Tooltip, TooltipContent, TooltipTrigger } from '@components/ui/tooltip';
import type { ComposerTool } from '../types/studio.types';

const props = defineProps<{ tools: ComposerTool[] }>();

const emit = defineEmits<{ pick: [tool: ComposerTool] }>();
</script>

<template>
  <Tooltip v-for="tool in props.tools" :key="tool.id">
    <TooltipTrigger as-child>
      <button
        type="button"
        class="grid size-7 shrink-0 place-items-center rounded-md text-ink-muted transition-colors hover:bg-line/60 hover:text-ink"
        :aria-label="tool.label"
        @click="emit('pick', tool)"
      >
        <component :is="tool.icon" class="size-4" aria-hidden="true" />
      </button>
    </TooltipTrigger>
    <TooltipContent>{{ tool.label }}</TooltipContent>
  </Tooltip>
</template>
