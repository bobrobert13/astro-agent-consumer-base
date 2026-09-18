<script setup lang="ts">
/**
 * @file src/domains/connectors/components/ConnectorsHeader.vue
 * @description Cabecera de la vista de conectores: vuelta al chat, título y las
 * dos acciones del catálogo.
 *
 * Es una barra de una sola franja y centrada con la misma medida que el contenido
 * (`max-w-column`), para que el título no se despegue de lo que hay debajo.
 *
 * En móvil los dos botones se quedan con su icono y sin texto: son las acciones
 * secundarias de la pantalla y el ancho no da para las dos etiquetas. El
 * `aria-label` se queda siempre, así que lo que se pierde es el texto, no el
 * nombre del control.
 */
import { ArrowLeft, Plus, RefreshCw } from '@lucide/vue';

import { Button } from '@components/ui/button';

import { CONNECTOR_COPY } from '../data/connectors.seed';
import { useConnectors } from '../composables/useConnectors';

const emit = defineEmits<{
  close: [];
  add: [];
}>();

const { loading, refresh } = useConnectors();
</script>

<template>
  <header class="shrink-0 border-b border-line bg-surface">
    <div class="mx-auto flex w-full max-w-column items-center gap-2 px-gutter py-3">
      <Button variant="ghost" size="icon" :aria-label="CONNECTOR_COPY.back" :title="CONNECTOR_COPY.back" @click="emit('close')">
        <ArrowLeft />
      </Button>

      <div class="min-w-0 flex-1">
        <strong class="block truncate text-title-sm">{{ CONNECTOR_COPY.title }}</strong>
        <small class="block truncate">{{ CONNECTOR_COPY.subtitle }}</small>
      </div>

      <Button
        variant="outline"
        size="sm"
        class="shrink-0"
        :disabled="loading"
        :aria-label="loading ? CONNECTOR_COPY.refreshBusy : CONNECTOR_COPY.refresh"
        @click="refresh()"
      >
        <RefreshCw :class="loading ? 'animate-spin' : ''" aria-hidden="true" />
        <span class="max-nav:hidden">{{ loading ? CONNECTOR_COPY.refreshBusy : CONNECTOR_COPY.refresh }}</span>
      </Button>

      <Button size="sm" class="shrink-0" :aria-label="CONNECTOR_COPY.add" @click="emit('add')">
        <Plus aria-hidden="true" />
        <span class="max-nav:hidden">{{ CONNECTOR_COPY.add }}</span>
      </Button>
    </div>
  </header>
</template>
