<script setup lang="ts">
/**
 * @file src/domains/connectors/views/ConnectorsDrawer.vue
 * @description El panel de conectores como **columna del estudio**, no como otra
 * pantalla.
 *
 * **Qué es.** Una columna de la fila del estudio, hermana del panel de contexto:
 * se abre a su derecha, empuja al chat en vez de taparlo y **no** bloquea nada —sin
 * overlay ni foco atrapado—, así que el composer sigue escribible mientras está
 * abierto. Es lo que pide "no salir del estudio": aquí no hay navegación, la URL no
 * cambia y el hilo sigue vivo detrás.
 *
 * **Quién lo abre.** El estudio, con `useStudioShell`: la franja del composer, el
 * rail y las herramientas del composer entran por secciones distintas, así que la
 * sección activa llega por prop y el panel solo la devuelve cuando la cambia
 * (`update:tab`). Este componente no navega ni conoce el estudio: recibe `open` y
 * `tab` y emite `close` y `update:tab`. Por eso el slice de conectores no importa
 * nada de `chat-studio` y no hay ciclo entre los dos.
 *
 * **Cómo se comporta la fila.** El CSS decide, por ancho de ventana:
 *  - a partir del corte del drawer (1200 px), es una columna de 21.25rem —el mismo
 *    ancho que el panel de contexto— y los dos conviven;
 *  - por debajo, es una capa fija por la derecha que **se superpone** al panel de
 *    contexto en vez de estrangular el chat, y por debajo del corte del contexto
 *    (1100 px) ocupa el ancho entero, porque allí el de contexto ya es un cajón.
 *
 * El cierre va con `transform`/`margin-right` negativo (sin reflow, como el rail) y
 * lleva `inert` cuando está cerrado: fuera de pantalla no debe ser alcanzable con el
 * teclado. El panel se monta **siempre** —igual que el de contexto— para que la
 * animación de apertura tenga de dónde salir.
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
  /** ¿Está abierto? Quien lo decide es el estudio. */
  open: boolean;
  /** Sección activa, por si quien abre quiere entrar en una concreta. */
  tab: ConnectorTab;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  close: [];
  'update:tab': [tab: ConnectorTab];
}>();

// El shell se provee aquí y se reparte a mano. Este componente no puede inyectar
// lo que acaba de proveer (`inject` resuelve desde el padre), así que los
// descendientes lo leen con `useConnectors()` y este trabaja con el objeto que le
// devuelve `provideConnectors`.
const shell = provideConnectors();
const { openAdd, setTab, tab } = shell;

/**
 * La sección puede cambiar desde fuera —el rail abre el panel en "Plantillas"
 * mientras ya está abierto—, así que la prop se escucha. El `immediate` es lo que
 * aplica la sección de entrada.
 */
watch(
  () => props.tab,
  (next) => setTab(next),
  { immediate: true }
);

function onTabChange(value: string | number): void {
  if (typeof value !== 'string' || !isConnectorTab(value)) return;

  setTab(value);
  emit('update:tab', value);
}
</script>

<template>
  <aside
    :aria-label="CONNECTOR_COPY.title"
    :inert="props.open ? undefined : true"
    data-density="compact"
    class="fixed inset-y-0 right-0 z-40 flex w-context shrink-0 flex-col border-l border-line bg-surface shadow-float transition-[transform,margin-right] duration-200 ease-out max-context:w-full drawer:static drawer:z-0 drawer:shadow-none"
    :class="props.open ? 'translate-x-0 drawer:mr-0' : 'translate-x-full drawer:-mr-context'"
  >
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
  </aside>
</template>
