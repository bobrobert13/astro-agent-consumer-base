<script setup lang="ts">
/**
 * @file src/domains/chat-studio/components/StudioSidePanel.vue
 * @description El panel lateral del estudio: la columna de la derecha donde viven
 * los espacios de trabajo —conectores y configuración—.
 *
 * **Es la geometría, no el contenido.** Aquí viven el ancho, el cierre con margen
 * negativo, la densidad compacta y el `inert`; el contenido lo pone cada espacio
 * (`ConnectorsPanel`, `SettingsPanel`). Por eso los dos se ven exactamente iguales
 * sin CSS duplicado —que es como dos cajones acaban divergiendo— y por eso el
 * estudio es quien decide qué espacio se ve.
 *
 * **Un espacio a la vez.** Abrir configuración con conectores abiertos cambia el
 * contenido; no apila otro panel. "Como mucho dos" cuenta el de contexto y este. La
 * consecuencia asumida es que el estado interno del espacio que se va —filtros,
 * búsqueda, detalle— se pierde al cambiar: es el precio de no tener dos verdades, y
 * volver a "Conectores" no reabre una ficha que ya no se estaba mirando.
 *
 * **Cómo se comporta la fila**, por ancho de ventana: a partir del corte del drawer
 * (1200 px) es una columna de 21.25rem —el mismo ancho que el panel de contexto— y
 * los dos conviven; por debajo es una capa fija por la derecha que **se superpone**
 * al de contexto en vez de estrangular el chat; y por debajo del corte del contexto
 * (1100 px) ocupa el ancho entero, porque allí el de contexto ya es un cajón.
 *
 * El cierre va con `transform`/`margin-right` negativo (sin reflow, como el rail) y
 * lleva `inert` cuando está cerrado: fuera de pantalla no debe ser alcanzable con el
 * teclado. Ojo con `inert`, que es booleano **por presencia**: `:inert="false"`
 * pinta `inert="false"` y dejaría inerte el panel abierto, así que se pasa
 * `undefined` para quitarlo.
 */
import { computed } from 'vue';

import { ConnectorsPanel } from '@domains/connectors';

import { STUDIO_COPY } from '../data/studio.seed';
import type { PanelScope } from '../types/studio.types';
import type { ConnectorTab } from '@domains/connectors';

interface Props {
  /** Espacio abierto, o `null` si el panel está cerrado. */
  panel: PanelScope | null;
  /** Sección del espacio de conectores, que el estudio recuerda entre aperturas. */
  connectorsTab: ConnectorTab;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  close: [];
  'update:connectors-tab': [tab: ConnectorTab];
}>();

const open = computed(() => props.panel !== null);

/** Nombre del espacio para el lector de pantalla: el panel es una región. */
const label = computed(() =>
  props.panel === 'configuracion' ? STUDIO_COPY.settings : STUDIO_COPY.connectors
);
</script>

<template>
  <aside
    :aria-label="label"
    :inert="open ? undefined : true"
    data-density="compact"
    class="fixed inset-y-0 right-0 z-40 flex w-context shrink-0 flex-col border-l border-line bg-surface shadow-float transition-[transform,margin-right] duration-200 ease-out max-context:w-full drawer:static drawer:z-0 drawer:shadow-none"
    :class="open ? 'translate-x-0 drawer:mr-0' : 'translate-x-full drawer:-mr-context'"
  >
    <ConnectorsPanel
      v-if="props.panel === 'conectores'"
      :tab="props.connectorsTab"
      @update:tab="emit('update:connectors-tab', $event)"
      @close="emit('close')"
    />
  </aside>
</template>
