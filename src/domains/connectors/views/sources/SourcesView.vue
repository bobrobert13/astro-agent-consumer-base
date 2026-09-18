<script setup lang="ts">
/**
 * @file src/domains/connectors/views/sources/SourcesView.vue
 * @description Catálogo de fuentes externas: búsqueda, filtro por estado y lista de
 * tarjetas —o el detalle de una, si hay una abierta—.
 *
 * **Los tres estados se ven de verdad**, no de adorno: `loading` lo levanta el
 * botón "Actualizar" de la cabecera (un simulacro con temporizador mientras no haya
 * servicio), el vacío sale de combinar búsqueda y filtro —y por eso trae su botón
 * para deshacerlos— y el aviso de atención cuenta las fuentes que no están sanas.
 * Una vista de catálogo que solo sabe pintar el caso bueno se rompe en el primer
 * caso malo.
 *
 * **Detalle y listado son excluyentes**: el detalle sustituye a la lista en vez de
 * convivir con ella.
 *
 * **Compacta y sin breakpoints.** El contador se va a la línea de los filtros —una
 * fila menos— y los controles bajan un escalón (`xs`, `h-8`): en 340 px un botón de
 * 32 px con 14 px de texto pesa demasiado. Aquí no se usan `nav:`/`context:` porque
 * miden la **ventana**, no el contenedor: a 1400 px de pantalla el panel sigue
 * teniendo 340 y la variante mentiría. Lo que se apila lo decide el flujo.
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
        class="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-ink-muted"
        aria-hidden="true"
      />
      <Input
        v-model="query"
        type="search"
        class="h-8 pl-8"
        :aria-label="CONNECTOR_COPY.search"
        :placeholder="CONNECTOR_COPY.search"
      />
    </div>

    <div class="mt-2.5 flex flex-wrap items-center gap-1.5">
      <div role="group" :aria-label="CONNECTOR_COPY.filterLabel" class="flex flex-wrap gap-1.5">
        <Button
          v-for="entry in CONNECTOR_FILTERS"
          :key="entry.id"
          size="xs"
          :variant="filter === entry.id ? 'default' : 'outline'"
          :aria-pressed="filter === entry.id"
          @click="setFilter(entry.id)"
        >
          {{ entry.label }}
        </Button>
      </div>

      <small class="ml-auto">{{ summary }}</small>
    </div>

    <Alert v-if="troubled > 0" class="mt-2.5">
      <CircleAlert />
      <AlertTitle>{{ CONNECTOR_COPY.errorTitle }}</AlertTitle>
      <AlertDescription>{{ CONNECTOR_COPY.errorBody }}</AlertDescription>
    </Alert>

    <div v-if="loading" class="mt-2.5 flex flex-col gap-3" aria-busy="true">
      <Skeleton v-for="slot in 3" :key="slot" class="h-40 rounded-xl" />
    </div>

    <ul v-else-if="visible.length > 0" class="mt-2.5 flex flex-col gap-3">
      <li v-for="connector in visible" :key="connector.id">
        <SourceCard :connector="connector" @open="openDetail" @configure="openConfig" />
      </li>
    </ul>

    <div
      v-else
      class="mt-2.5 flex flex-col items-center gap-2.5 rounded-panel border border-dashed border-line px-5 py-10 text-center"
    >
      <span class="grid size-10 place-items-center rounded-full bg-elevated text-ink-muted">
        <Boxes class="size-4.5" aria-hidden="true" />
      </span>
      <strong class="text-title-sm">{{ CONNECTOR_COPY.emptyTitle }}</strong>
      <p class="text-caption text-ink-muted">{{ CONNECTOR_COPY.emptyBody }}</p>
      <Button variant="outline" size="xs" @click="clearFilters()">{{ CONNECTOR_COPY.clearFilters }}</Button>
    </div>
  </section>
</template>
