<script setup lang="ts">
/**
 * @file src/domains/chat-studio/components/StudioFabs.vue
 * @description Acciones flotantes de la esquina inferior derecha: traducir y ayuda.
 *
 * Se colocan sobre la franja del pie, a la derecha del aviso centrado —que por eso
 * lleva relleno lateral de sobra—, y no flotan sobre el composer: el composer está
 * acoplado abajo en cuanto hay conversación, y taparlo con un botón sería cambiar
 * una fidelidad por un estorbo.
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
  <div class="absolute right-8 bottom-5 z-30 hidden gap-4 nav:flex">
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
