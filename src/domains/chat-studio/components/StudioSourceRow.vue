<script setup lang="ts">
/**
 * @file src/domains/chat-studio/components/StudioSourceRow.vue
 * @description Una fila de fuente: la referencia que el agente usó y, al pulsarla,
 * su detalle **en el mismo sitio**.
 *
 * **Se despliega, no navega.** Antes esta fila avisaba de que abrir una fuente no
 * estaba implementado; un aviso que interrumpe para decir que no hay nada es peor
 * que no hacer nada, así que ahora el detalle se abre donde está la fila: el panel
 * no se tapa, no se pierde el hilo de la conversación y no hay ninguna pantalla que
 * "aparezca".
 *
 * **Por qué `Collapsible` y no un `v-if`.** La altura real del contenido la publica
 * reka-ui en `--reka-collapsible-content-height` mientras está abierto, y el
 * fotograma (`animate-collapsible-down/up`, en `theme.css` y `global.css`) la usa
 * como destino: es la única forma de animar de `0` a `auto` sin medir nada a mano.
 * En reposo reka deja el contenedor montado pero **oculto y vacío**, así que no
 * ocupa sitio ni hay nada que un lector de pantalla pueda leer.
 *
 * El "favicon" es la inicial del dominio sobre el token de marca, como en la
 * plantilla: sin red, sin imágenes y sin depender de un servicio de iconos.
 */
import { ChevronDown } from '@lucide/vue';
import { computed } from 'vue';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@components/ui/collapsible';

import { STUDIO_COPY } from '../data/studio.seed';
import type { SourceRow } from '../types/studio.types';

const props = defineProps<{ source: SourceRow }>();

const initial = computed(() => props.source.domain.slice(0, 1));
const isSession = computed(() => props.source.scope === 'session');

/** Qué significa el ámbito, en palabras: es la mitad del valor del desglose. */
const scopeHint = computed(() =>
  isSession.value ? STUDIO_COPY.sourceScopeSession : STUDIO_COPY.sourceScopeInteraction
);
</script>

<template>
  <Collapsible class="rounded-panel border border-line bg-surface transition-colors hover:border-brand-500/40">
    <CollapsibleTrigger class="group flex w-full items-start gap-3 p-2.5 text-left">
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
            :class="isSession ? 'bg-elevated text-ink-muted' : 'bg-brand-050 text-brand-600'"
          >
            {{ isSession ? 'sesión' : 'interacción' }}
          </span>
        </span>

        <span class="mt-0.5 mb-1 truncate text-caption text-brand-600">{{ props.source.domain }}</span>
        <span class="line-clamp-2 text-caption text-ink-muted">{{ props.source.snippet }}</span>
        <span class="mt-1.5 text-caption text-ink-muted">{{ props.source.usedAt }}</span>
      </span>

      <ChevronDown
        class="mt-0.5 size-4 shrink-0 text-ink-muted transition-transform duration-200 group-data-[state=open]:rotate-180"
        aria-hidden="true"
      />
    </CollapsibleTrigger>

    <CollapsibleContent
      class="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down"
    >
      <div class="flex flex-col gap-1.5 border-t border-line px-2.5 py-2.5">
        <p class="text-caption text-ink">{{ props.source.snippet }}</p>
        <p class="text-caption text-ink-muted">{{ scopeHint }}</p>
        <p class="mt-0.5 truncate font-mono text-caption text-ink-muted">{{ props.source.url }}</p>
      </div>
    </CollapsibleContent>
  </Collapsible>
</template>
