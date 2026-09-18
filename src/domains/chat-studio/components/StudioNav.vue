<script setup lang="ts">
/**
 * @file src/domains/chat-studio/components/StudioNav.vue
 * @description Secciones de la navegación lateral.
 *
 * Dos de las tres ya tienen destino: abren el panel de conectores en su sección
 * —base de conocimiento y plantillas— **sin cambiar de pantalla**. "Explorar" sigue
 * sin destino, así que en vez de dejar un botón mudo, que el usuario lee como una
 * app rota, lo dice con un aviso.
 */
import type { ConnectorTab } from '@domains/connectors';

import { STUDIO_NAV } from '../data/studio.seed';
import { useStudioShell } from '../composables/useStudioShell';
import type { NavItem } from '../types/studio.types';

const { notYet, openConnectors } = useStudioShell();

/** Secciones que viven dentro del panel de conectores. */
const DESTINATIONS: Record<string, ConnectorTab> = {
  knowledge: 'conocimiento',
  templates: 'plantillas',
};

function onNav(item: NavItem): void {
  const tab = DESTINATIONS[item.id];
  if (tab === undefined) {
    notYet(item.label);
    return;
  }

  openConnectors(tab);
}
</script>

<template>
  <nav aria-label="Secciones" class="mt-1.5 flex flex-col gap-1">
    <button
      v-for="item in STUDIO_NAV"
      :key="item.id"
      type="button"
      class="flex h-9 w-full items-center gap-2 rounded-control px-1.5 text-left text-label text-ink transition-colors hover:bg-line/60"
      @click="onNav(item)"
    >
      <component :is="item.icon" class="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
      <span class="truncate">{{ item.label }}</span>
    </button>
  </nav>
</template>
