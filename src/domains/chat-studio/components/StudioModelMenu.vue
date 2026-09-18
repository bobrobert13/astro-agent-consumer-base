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
import { DropdownMenu, DropdownMenuTrigger } from '@components/ui/dropdown-menu';
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <button
        type="button"
        class="-ml-2.5 flex min-w-0 items-center gap-1.5 rounded-control px-2.5 py-1.5 text-title-sm text-ink transition-colors hover:bg-line/60"
      >
      </button>
    </DropdownMenuTrigger>
  </DropdownMenu>
</template>
