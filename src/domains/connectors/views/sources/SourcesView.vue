<script setup lang="ts">
/**
 * @file src/domains/connectors/views/sources/SourcesView.vue
 * @description Catálogo de fuentes externas: búsqueda, filtro por estado y lista de
 * tarjetas —o el detalle de una, si hay una abierta—.
 *
 * **Los tres estados se ven de verdad**, no de adorno: `loading` lo levanta el
 * botón "Actualizar" de la cabecera (un simulacro con temporizador mientras no
 * haya servicio), el vacío sale de combinar búsqueda y filtro —y por eso trae su
 * botón para deshacerlos— y el aviso de atención cuenta las fuentes que no están
 * sanas. Una vista de catálogo que solo sabe pintar el caso bueno se rompe en el
 * primer caso malo.
 *
 * **Detalle y listado son excluyentes**, como el estado vacío y el hilo del
 * estudio: el detalle sustituye a la lista en vez de convivir con ella.
 *
 * **Una sola columna, y sin breakpoints.** Este contenido vive en una columna de
 * 21.25rem, así que las variantes `nav:`/`context:` —que miden la **ventana**, no
 * el contenedor— mentirían: a 1400 px de ventana el panel sigue teniendo 340 px. Lo
 * que se apila es lo que no cabe, y eso lo decide el propio flujo con `flex-wrap`.
 */
import { Boxes, CircleAlert, Search } from '@lucide/vue';
import { computed } from 'vue';

import { Alert, AlertDescription, AlertTitle } from '@components/ui/alert';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Skeleton } from '@components/ui/skeleton';

import SourceCard from './SourceCard.vue';
import SourceDetail from './SourceDetail.vue';
import { CONNECTOR_COPY, CONNECTOR_FILTERS } from '../../data/connectors.seed';
import { useConnectors } from '../../composables/useConnectors';

const {
  clearFilters,
  connectors,
  detail,
  filter,
  loading,
  openConfig,
  openDetail,
  query,
  setFilter,
  troubled,
  visible,
} = useConnectors();

/** Cuántas de cuántas: sin esto, un filtro activo parece un catálogo vacío. */
const summary = computed(() => `${visible.value.length} de ${connectors.value.length}`);
</script>

<template>
  <SourceDetail v-if="detail !== null" :connector="detail" />

  <section v-else aria-label="Fuentes externas" class="flex flex-col">
    <div class="relative w-full">
      <Search
        class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted"
        aria-hidden="true"
      />
      <Input
        v-model="query"
        type="search"
        class="pl-9"
        :aria-label="CONNECTOR_COPY.search"
        :placeholder="CONNECTOR_COPY.search"
      />
    </div>

    <div role="group" :aria-label="CONNECTOR_COPY.filterLabel" class="mt-3 flex flex-wrap gap-1.5">
      <Button
        v-for="entry in CONNECTOR_FILTERS"
        :key="entry.id"
        size="sm"
        :variant="filter === entry.id ? 'default' : 'outline'"
        :aria-pressed="filter === entry.id"
        @click="setFilter(entry.id)"
      >
        {{ entry.label }}
      </Button>
    </div>

    <Alert v-if="troubled > 0" class="mt-4">
      <CircleAlert />
      <AlertTitle>{{ CONNECTOR_COPY.errorTitle }}</AlertTitle>
      <AlertDescription>{{ CONNECTOR_COPY.errorBody }}</AlertDescription>
    </Alert>

    <p class="mt-4 text-caption text-ink-muted">{{ summary }}</p>

    <div v-if="loading" class="mt-3 flex flex-col gap-4" aria-busy="true">
      <Skeleton v-for="slot in 3" :key="slot" class="h-52 rounded-xl" />
    </div>

    <ul v-else-if="visible.length > 0" class="mt-3 flex flex-col gap-4">
      <li v-for="connector in visible" :key="connector.id">
        <SourceCard :connector="connector" @open="openDetail" @configure="openConfig" />
      </li>
    </ul>

    <div
      v-else
      class="mt-3 flex flex-col items-center gap-3 rounded-panel border border-dashed border-line px-6 py-12 text-center"
    >
      <span class="grid size-11 place-items-center rounded-full bg-elevated text-ink-muted">
        <Boxes class="size-5" aria-hidden="true" />
      </span>
      <strong class="text-title-sm">{{ CONNECTOR_COPY.emptyTitle }}</strong>
      <p class="text-body-sm text-ink-muted">{{ CONNECTOR_COPY.emptyBody }}</p>
      <Button variant="outline" size="sm" @click="clearFilters()">{{ CONNECTOR_COPY.clearFilters }}</Button>
    </div>
  </section>
</template>

