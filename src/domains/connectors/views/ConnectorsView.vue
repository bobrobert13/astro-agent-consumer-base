<script setup lang="ts">
/**
 * @file src/domains/connectors/views/ConnectorsView.vue
 * @description Raíz de la vista de conectores: la capa a pantalla completa que se
 * abre encima del estudio, con sus tres pestañas.
 *
 * **Es una capa, no otra pantalla.** Se monta en el `slot="layer"` de
 * `AppLayout`, que la pinta después de `ChatStudio`: el estudio sigue montado y
 * persistido debajo —con su hilo y su stream vivos— porque esta vista se abre
 * también a mitad de conversación desde el rail. Sin eso, entrar a configurar una
 * fuente cortaría la respuesta en curso.
 *
 * **La pestaña es la URL.** Se lee del `?pestana=` en el servidor y, al cambiarla,
 * se reescribe con `history.replaceState` en vez de navegar: es el mismo contrato
 * —el enlace se puede compartir y recargar— sin volver a pedir la página. Eso es
 * lo que hace que `close()` sí sea una navegación y el botón atrás del navegador
 * funcione solo.
 *
 * **Las pestañas son las del registry.** El estudio se maqueta sus propias
 * pestañas porque necesita un indicador inferior y un contador en píldora que
 * obligarían a pelear con las clases internas del componente; aquí la forma que
 * queremos es la que el registry ya trae, así que solo se ajusta lo que es
 * maquetación —el ancho de la barra y el aire sobre el contenido— y ni una clase
 * de apariencia.
 *
 * **El modal vive fuera del contenedor que scrollea**, como en el estudio: es una
 * capa, y anidarlo en una caja con `overflow-y-auto` lo recortaría.
 */
import { watch } from 'vue';

import { navigate } from 'astro:transitions/client';

import { Badge } from '@components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@components/ui/tabs';
import { routes } from '@config/routes';

import ConnectorConfigDialog from '../components/ConnectorConfigDialog.vue';
import ConnectorsHeader from '../components/ConnectorsHeader.vue';
import KnowledgeView from './knowledge/KnowledgeView.vue';
import SourcesView from './sources/SourcesView.vue';
import TemplatesView from './templates/TemplatesView.vue';
import { CONNECTOR_COPY, CONNECTOR_TABS } from '../data/connectors.seed';
import { provideConnectors } from '../composables/useConnectors';
import { isConnectorTab, type ConnectorTab } from '../types/connector.types';

const props = withDefaults(
  defineProps<{
    /** Pestaña inicial, ya validada por la página al leer `?pestana=`. */
    tab?: ConnectorTab | undefined;
    /** Ruta interna a la que vuelve la capa al cerrarse (`?volver=`). */
    volver?: string | undefined;
  }>(),
  { tab: undefined, volver: undefined }
);

// El shell se provee aquí y se reparte a mano. Este componente no puede inyectar
// lo que acaba de proveer (`inject` resuelve desde el padre), así que trabaja con
// el objeto que le devuelve `provideConnectors`.
const shell = provideConnectors({ initialTab: props.tab ?? 'fuentes' });
const { counts, notYet, setTab, tab } = shell;

/**
 * La pestaña puede cambiar desde fuera —el rail navega a `/conectores?pestana=…`
 * y esta isla ya está montada—, así que la prop se escucha igual que el estudio
 * escucha su hilo.
 */
watch(
  () => props.tab,
  (next) => {
    if (next !== undefined) setTab(next);
  }
);

function onTabChange(value: string | number): void {
  if (typeof value !== 'string' || !isConnectorTab(value)) return;
  setTab(value);

  // Solo cambia la pestaña: el resto de la query —hilo, agente, vuelta— se
  // conserva tal cual, así que se reescribe sobre la actual en vez de
  // reconstruirla desde cero.
  const params = new URLSearchParams(window.location.search);
  params.set('pestana', value);
  window.history.replaceState(window.history.state, '', `${window.location.pathname}?${params.toString()}`);
}

/**
 * Solo rutas internas. Un `?volver=` viaja en la URL, y por tanto lo controla
 * quien la comparte: sin esta guarda, un enlace preparado podría sacar a la
 * persona de la aplicación al cerrar la capa.
 */
function backTarget(): string {
  const target = props.volver;
  if (target === undefined || !target.startsWith('/') || target.startsWith('//')) return routes.home();
  return target;
}

function close(): void {
  void navigate(backTarget());
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex flex-col bg-canvas text-ink">
    <ConnectorsHeader @close="close()" @add="notYet(CONNECTOR_COPY.add)" />

    <div class="min-h-0 flex-1 overflow-y-auto">
      <div class="mx-auto w-full max-w-column px-gutter py-block">
        <Tabs :model-value="tab" @update:model-value="onTabChange">
          <TabsList class="w-full" :aria-label="CONNECTOR_COPY.title">
            <TabsTrigger v-for="entry in CONNECTOR_TABS" :key="entry.id" :value="entry.id">
              <component :is="entry.icon" aria-hidden="true" />
              <span>{{ entry.label }}</span>
              <Badge variant="secondary">{{ counts[entry.id] }}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="fuentes" class="mt-4">
            <SourcesView />
          </TabsContent>

          <TabsContent value="conocimiento" class="mt-4">
            <KnowledgeView />
          </TabsContent>

          <TabsContent value="plantillas" class="mt-4">
            <TemplatesView />
          </TabsContent>
        </Tabs>
      </div>
    </div>

    <ConnectorConfigDialog />
  </div>
</template>
