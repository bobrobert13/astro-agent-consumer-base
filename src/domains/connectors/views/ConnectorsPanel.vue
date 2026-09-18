<script setup lang="ts">
/**
 * @file src/domains/connectors/views/ConnectorsPanel.vue
 * @description El espacio de conectores dentro del panel lateral del estudio:
 * fuentes externas, base de conocimiento y plantillas.
 *
 * **Es contenido, no cajón.** El ancho, el cierre con margen negativo, la densidad
 * compacta y el `inert` los pone `StudioSidePanel` (slice del estudio), que es quien
 * decide qué espacio se ve. Este componente se vería igual montado en cualquier otro
 * contenedor del mismo tamaño, y ese es el punto: la geometría del cajón vive en un
 * solo sitio y los espacios no pueden divergir.
 *
 * **Quién lo abre.** El estudio, con `useStudioShell`: la franja del composer, el
 * rail y las herramientas del composer entran por secciones distintas, así que la
 * sección activa llega por prop y el panel solo la devuelve cuando la cambia
 * (`update:tab`). No navega ni conoce el estudio: por eso el slice de conectores no
 * importa nada de `chat-studio` y no hay ciclo entre los dos.
 *
 * **La sección la recuerda el estudio, no este componente.** Se aplica al montar
 * (`immediate`) y se sincroniza con la prop cuando cambia desde fuera.
 */
import { watch } from 'vue';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@components/ui/tabs';

import ConnectorAddDialog from '../components/ConnectorAddDialog.vue';
import ConnectorConfigDialog from '../components/ConnectorConfigDialog.vue';
import ConnectorsHeader from '../components/ConnectorsHeader.vue';
import KnowledgeView from './knowledge/KnowledgeView.vue';
import SourcesView from './sources/SourcesView.vue';
import TemplatesView from './templates/TemplatesView.vue';
import { CONNECTOR_COPY, CONNECTOR_TABS } from '../data/connectors.seed';
import { provideConnectors } from '../composables/useConnectors';
import { isConnectorTab, type ConnectorTab } from '../types/connector.types';

interface Props {
  /** Sección activa, que recuerda el estudio. */
  tab: ConnectorTab;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  close: [];
  'update:tab': [tab: ConnectorTab];
}>();

// El shell se provee aquí y se reparte a mano. Este componente no puede inyectar lo
// que acaba de proveer (`inject` resuelve desde el padre), así que los descendientes
// lo leen con `useConnectors()` y este trabaja con el objeto que le devuelve
// `provideConnectors`.
const shell = provideConnectors();
const { openAdd, setTab, tab } = shell;

/** El `immediate` aplica la sección de entrada; el `watch`, la que llega de fuera. */
watch(() => props.tab, setTab, { immediate: true });

function onTabChange(value: string | number): void {
  if (typeof value !== 'string' || !isConnectorTab(value)) return;

  setTab(value);
  emit('update:tab', value);
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <ConnectorsHeader @close="emit('close')" @add="openAdd()" />

    <Tabs :model-value="tab" class="min-h-0 flex-1 gap-3" @update:model-value="onTabChange">
      <div class="shrink-0 px-3 pt-3">
        <TabsList class="h-8 w-full" :aria-label="CONNECTOR_COPY.title">
          <TabsTrigger
            v-for="entry in CONNECTOR_TABS"
            :key="entry.id"
            :value="entry.id"
            :aria-label="entry.label"
            :title="entry.label"
          >
            <component :is="entry.icon" aria-hidden="true" />
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="fuentes" class="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        <SourcesView />
      </TabsContent>

      <TabsContent value="conocimiento" class="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        <KnowledgeView />
      </TabsContent>

      <TabsContent value="plantillas" class="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        <TemplatesView />
      </TabsContent>
    </Tabs>

    <!-- Los modales viven fuera de la zona que scrollea: son capas, y anidarlos en
         una caja con scroll los recortaría. -->
    <ConnectorConfigDialog />
    <ConnectorAddDialog />
  </div>
</template>
