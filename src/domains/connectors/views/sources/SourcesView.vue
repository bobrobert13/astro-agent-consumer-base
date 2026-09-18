<script setup lang="ts">
/**
 * @file src/domains/connectors/views/sources/SourcesView.vue
 * @description Catálogo de fuentes externas: búsqueda, filtro por estado y
 * rejilla de tarjetas.
 *
 * **Los tres estados se ven de verdad**, no de adorno: `loading` lo levanta el
 * botón "Actualizar" de la cabecera (un simulacro con temporizador mientras no
 * haya servicio), el vacío sale de combinar búsqueda y filtro —y por eso trae su
 * botón para deshacerlos— y el aviso de atención cuenta los conectores que no
 * están sanos. Una vista de catálogo que solo sabe pintar el caso bueno se rompe
 * en el primer caso malo.
 *
 * El buscador y los filtros son del registry (`Input`, `Button`) y la rejilla es
 * una lista con `gap`: no hay una tabla que mantener cuando las tarjetas cambian de
 * contenido.
 */
import { Boxes, CircleAlert, Search } from '@lucide/vue';
import { computed } from 'vue';

import { Alert, AlertDescription, AlertTitle } from '@components/ui/alert';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Skeleton } from '@components/ui/skeleton';

import SourceCard from './SourceCard.vue';
import { CONNECTOR_COPY, CONNECTOR_FILTERS } from '../../data/connectors.seed';
import { useConnectors } from '../../composables/useConnectors';

const { clearFilters, connectors, filter, loading, openConfig, openDetail, query, setFilter, troubled, visible } =
  useConnectors();

/** Cuántos de cuántos: sin esto, un filtro activo parece un catálogo vacío. */
const summary = computed(() => `${visible.value.length} de ${connectors.value.length}`);
</script>

<template>
  <section aria-label="Fuentes externas" class="flex flex-col">
    <div class="flex flex-col gap-3 nav:flex-row nav:items-center nav:justify-between">
      <div class="relative w-full nav:max-w-80">
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

      <div role="group" :aria-label="CONNECTOR_COPY.filterLabel" class="flex flex-wrap gap-1.5">
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
    </div>

    <Alert v-if="troubled > 0" class="mt-4">
      <CircleAlert />
      <AlertTitle>{{ CONNECTOR_COPY.errorTitle }}</AlertTitle>
      <AlertDescription>{{ CONNECTOR_COPY.errorBody }}</AlertDescription>
    </Alert>

    <p class="mt-4 text-caption text-ink-muted">{{ summary }}</p>

    <div v-if="loading" class="mt-3 grid gap-5 nav:grid-cols-2" aria-busy="true">
      <Skeleton v-for="slot in 4" :key="slot" class="h-56 rounded-xl" />
    </div>

    <ul v-else-if="visible.length > 0" class="mt-3 grid gap-5 nav:grid-cols-2">
      <li v-for="connector in visible" :key="connector.id">
        <SourceCard :connector="connector" @open="openDetail" @configure="openConfig" />
      </li>
    </ul>

    <div
      v-else
      class="mt-3 flex flex-col items-center gap-3 rounded-panel border border-dashed border-line px-6 py-14 text-center"
    >
      <span class="grid size-11 place-items-center rounded-full bg-elevated text-ink-muted">
        <Boxes class="size-5" aria-hidden="true" />
      </span>
      <strong class="text-title-sm">{{ CONNECTOR_COPY.emptyTitle }}</strong>
      <p class="max-w-prose text-body-sm text-ink-muted">{{ CONNECTOR_COPY.emptyBody }}</p>
      <Button variant="outline" size="sm" @click="clearFilters()">{{ CONNECTOR_COPY.clearFilters }}</Button>
    </div>
  </section>
</template>
