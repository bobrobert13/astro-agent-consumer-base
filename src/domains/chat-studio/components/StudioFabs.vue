<script setup lang="ts">
/**
 * @file src/domains/chat-studio/components/StudioFabs.vue
 * @description Acciones de la esquina inferior derecha: traducir y ayuda.
 *
 * **Van en la fila del pie, no flotando encima.** Antes eran `absolute` sobre la
 * franja del aviso legal, y el texto pasaba por debajo de los botones en cuanto la
 * ventana se estrechaba. Ahora ocupan su propia columna a la derecha del pie: el
 * ancho es fijo (`w-24`, lo que miden los dos botones con su separación) y el lado
 * opuesto lleva un hueco del mismo tamaño para que el aviso quede centrado. Así no
 * hay posición absoluta que pueda montarse sobre nada.
 *
 * En móvil no se pintan: ahí la esquina la ocupa el composer y la ayuda no cabe sin
 * tapar algo.
 */
import { CircleQuestionMark, Languages } from '@lucide/vue';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@components/ui/dropdown-menu';
import { useStudioShell } from '../composables/useStudioShell';

const { notYet } = useStudioShell();

const HELP = [
  { id: 'docs', label: 'Documentación' },
  { id: 'shortcuts', label: 'Atajos de teclado' },
  { id: 'connectors', label: 'Conectores externos (próximamente)' },
  { id: 'support', label: 'Contactar con soporte' },
];

const fab =
  'grid size-10 shrink-0 place-items-center rounded-full border border-line bg-surface text-ink shadow-sm transition-colors hover:bg-elevated';
</script>

<template>
  <div class="hidden w-24 shrink-0 items-center justify-end gap-4 nav:flex">
    <button type="button" :class="fab" aria-label="Traducir" title="Traducir" @click="notYet('Traducir')">
      <Languages class="size-4" aria-hidden="true" />
    </button>

    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <button type="button" :class="fab" aria-label="Ayuda" title="Ayuda">
          <CircleQuestionMark class="size-4" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" class="w-64">
        <DropdownMenuItem v-for="item in HELP" :key="item.id" @select="notYet(item.label)">
          {{ item.label }}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</template>
