<script setup lang="ts">
/**
 * @file src/domains/connectors/components/ConnectorsHeader.vue
 * @description Cabecera del panel: en qué sección estás y qué se puede hacer ahí.
 *
 * Es la cabecera de **una columna estrecha**, así que dice lo mínimo: el glifo y el
 * nombre de la sección activa, con su contador al lado, y tres botones de icono.
 * Aquí está la razón de que las pestañas no lleven texto: tres etiquetas completas
 * —"Base de conocimiento" entre ellas— no caben en 21.25rem sin desbordar, y tocar
 * las clases internas del `Tabs` del registry está prohibido. El nombre de la
 * sección se lee aquí, y las pestañas hacen de conmutador.
 *
 * "Actualizar" y "Añadir" viven en la cabecera y no dentro de una sección porque
 * son las dos acciones del panel entero: añadir es siempre añadir una fuente.
 *
 * Los botones van sin texto con `aria-label` **y** `title`: el primero es para el
 * lector de pantalla, el segundo para quien pasa el ratón. El panel no monta un
 * `TooltipProvider` propio —eso es del estudio—, así que el tooltip del registry no
 * está disponible aquí sin duplicar el proveedor.
 */
import { Plus, RefreshCw, X } from '@lucide/vue';
import { computed } from 'vue';

import { Button } from '@components/ui/button';

import { CONNECTOR_COPY, CONNECTOR_TAB_UNITS } from '../data/connectors.seed';
import { useConnectors } from '../composables/useConnectors';

const emit = defineEmits<{
  close: [];
  add: [];
}>();

const { activeTab, counts, loading, refresh } = useConnectors();

/** "3 fuentes": el contador dice de qué es, no solo cuánto. */
const count = computed(() => `${counts.value[activeTab.value.id]} ${CONNECTOR_TAB_UNITS[activeTab.value.id]}`);

const refreshLabel = computed(() => (loading.value ? CONNECTOR_COPY.refreshBusy : CONNECTOR_COPY.refresh));
</script>

<template>
  <header class="flex shrink-0 items-center gap-1 border-b border-line px-3 py-3">
    <span class="grid size-8 shrink-0 place-items-center rounded-control bg-brand-050 text-brand-600">
      <component :is="activeTab.icon" class="size-4" aria-hidden="true" />
    </span>

    <div class="min-w-0 flex-1 pr-1">
      <strong class="block truncate text-label text-ink">{{ activeTab.label }}</strong>
      <small class="block truncate">{{ count }}</small>
    </div>

    <Button
      variant="ghost"
      size="icon-sm"
      :disabled="loading"
      :aria-label="refreshLabel"
      :title="refreshLabel"
      @click="refresh()"
    >
      <RefreshCw :class="loading ? 'animate-spin' : ''" aria-hidden="true" />
    </Button>

    <Button variant="ghost" size="icon-sm" :aria-label="CONNECTOR_COPY.add" :title="CONNECTOR_COPY.add" @click="emit('add')">
      <Plus aria-hidden="true" />
    </Button>

    <Button variant="ghost" size="icon-sm" :aria-label="CONNECTOR_COPY.close" :title="CONNECTOR_COPY.close" @click="emit('close')">
      <X aria-hidden="true" />
    </Button>
  </header>
</template>
