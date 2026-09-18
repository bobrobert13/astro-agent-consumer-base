<script setup lang="ts">
/**
 * @file src/domains/chat-studio/components/StudioNav.vue
 * @description Secciones de la navegación lateral.
 *
 * Las dos abren el panel lateral en su sección **sin cambiar de pantalla**. Como
 * todas tienen destino, el mapa de abajo es exhaustivo por tipo (`NavId` es una
 * unión cerrada): no hay rama de "esto todavía no existe" que se pueda quedar
 * mintiendo, y añadir una sección al rail obliga a decidir a dónde va antes de que
 * compile.
 */
import type { ConnectorTab } from '@domains/connectors';

import { STUDIO_NAV } from '../data/studio.seed';
import { useStudioShell } from '../composables/useStudioShell';
import type { NavId, NavItem } from '../types/studio.types';

const { openConnectors } = useStudioShell();

/** Secciones que viven dentro del panel de conectores. */
const DESTINATIONS: Record<NavId, ConnectorTab> = {
  knowledge: 'conocimiento',
  templates: 'plantillas',
};

function onNav(item: NavItem): void {
  openConnectors(DESTINATIONS[item.id]);
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
