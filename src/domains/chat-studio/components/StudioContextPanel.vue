<script setup lang="ts">
/**
 * @file src/domains/chat-studio/components/StudioContextPanel.vue
 * @description Panel de contexto derecho: recursos de la conversación y fuentes
 * usadas, con el ámbito de las fuentes conmutables.
 *
 * Las pestañas se maquetan a mano con `role="tablist"` y tokens en vez de usar las
 * del registry: la forma que pide la plantilla —indicador inferior de 2 px y
 * contador en píldora— obligaría a sobreescribir las clases internas del
 * componente, y eso el repositorio lo prohíbe expresamente (se mueve el token, no
 * la clase). Con roles ARIA explícitos la accesibilidad es la misma.
 *
 * En escritorio el panel es un elemento más de la fila y se cierra con **margen
 * negativo** —lo que anima sin reflow—; por debajo del punto de corte del estudio
 * pasa a cajón lateral, igual que el rail en móvil.
 */
import { X } from '@lucide/vue';
import { computed } from 'vue';

import { STUDIO_COPY, STUDIO_RESOURCES, STUDIO_SOURCES } from '../data/studio.seed';
import { useStudioShell } from '../composables/useStudioShell';
import StudioResourceRow from './StudioResourceRow.vue';
import StudioSourceRow from './StudioSourceRow.vue';
import type { PanelTab, ResourceRow, SourceScope } from '../types/studio.types';

const { contextOpen, openPreview, scope, setScope, tab, setTab, toggleContext } = useStudioShell();

const TABS: { id: PanelTab; label: string }[] = [
  { id: 'recursos', label: 'Recursos' },
  { id: 'fuentes', label: 'Fuentes' },
];

const SCOPES: { id: SourceScope; label: string }[] = [
  { id: 'interaction', label: 'Interacción' },
  { id: 'session', label: 'Sesión' },
];

const resources = STUDIO_RESOURCES;

/** El contador de la pestaña es el total; el segmentado filtra dentro. */
const sources = computed(() => STUDIO_SOURCES.filter((source) => source.scope === scope.value));

function countOf(id: PanelTab): number {
  return id === 'recursos' ? resources.length : STUDIO_SOURCES.length;
}

function onOpenPreview(resource: ResourceRow): void {
  openPreview(resource);
}
</script>

<template>
  <aside
    aria-label="Panel de contexto"
    class="flex w-context shrink-0 flex-col border-l border-line bg-surface transition-[margin-right,transform] duration-200 ease-out max-context:fixed max-context:inset-y-0 max-context:right-0 max-context:z-40 max-context:shadow-float"
    :class="[
      contextOpen ? 'context:mr-0' : 'context:-mr-context',
      contextOpen ? 'max-context:translate-x-0' : 'max-context:translate-x-full',
    ]"
  >
    <header class="flex h-14 shrink-0 items-center gap-2 border-b border-line pr-3">
      <div role="tablist" aria-label="Secciones del panel" class="flex h-full flex-1 gap-1 pl-2">
        <button
          v-for="entry in TABS"
          :id="`studio-tab-${entry.id}`"
          :key="entry.id"
          type="button"
          role="tab"
          :aria-selected="tab === entry.id"
          :aria-controls="`studio-pane-${entry.id}`"
          class="relative flex flex-1 items-center justify-center gap-1.5 text-label transition-colors after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full"
          :class="
            tab === entry.id
              ? 'font-semibold text-brand-600 after:bg-brand-500'
              : 'text-ink-muted after:bg-transparent hover:text-ink'
          "
          @click="setTab(entry.id)"
        >
          <span>{{ entry.label }}</span>
          <span
            class="grid h-4.5 min-w-4.5 place-items-center rounded-full px-1 text-caption font-semibold"
            :class="tab === entry.id ? 'bg-brand-050 text-brand-600' : 'bg-elevated text-ink-muted'"
          >
            {{ countOf(entry.id) }}
          </span>
        </button>
      </div>

      <button
        type="button"
        class="grid size-8 shrink-0 place-items-center rounded-control text-ink-muted transition-colors hover:bg-line/60 hover:text-ink"
        aria-label="Cerrar panel"
        @click="toggleContext(false)"
      >
        <X class="size-4" aria-hidden="true" />
      </button>
    </header>

    <div class="min-h-0 flex-1 overflow-y-auto p-3.5">
      <section
        id="studio-pane-recursos"
        role="tabpanel"
        aria-labelledby="studio-tab-recursos"
        :hidden="tab !== 'recursos'"
      >
        <p class="mb-3 text-caption text-ink-muted">{{ STUDIO_COPY.contextHint }}</p>
        <ul class="flex flex-col gap-2">
          <li v-for="resource in resources" :key="resource.id">
            <StudioResourceRow :resource="resource" @open="onOpenPreview" />
          </li>
        </ul>
      </section>

      <section
        id="studio-pane-fuentes"
        role="tabpanel"
        aria-labelledby="studio-tab-fuentes"
        :hidden="tab !== 'fuentes'"
      >
        <div role="group" aria-label="Ámbito de las fuentes" class="mb-3 inline-flex gap-0.5 rounded-control bg-elevated p-0.5">
          <button
            v-for="entry in SCOPES"
            :key="entry.id"
            type="button"
            class="rounded-sm px-3 py-1 text-caption font-medium transition-colors"
            :class="scope === entry.id ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted hover:text-ink'"
            :aria-pressed="scope === entry.id"
            @click="setScope(entry.id)"
          >
            {{ entry.label }}
          </button>
        </div>

        <ul class="flex flex-col gap-2">
          <li v-for="source in sources" :key="source.id">
            <StudioSourceRow :source="source" />
          </li>
        </ul>
      </section>
    </div>
  </aside>
</template>
