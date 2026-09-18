<script setup lang="ts">
/**
 * @file src/domains/connectors/components/ConnectorConfigDialog.vue
 * @description Modal de configuración de un conector: sus campos de conexión y sus
 * permisos, sobre un **borrador**.
 *
 * El borrador lo prepara el shell (`editing`), que clona el conector al abrirse, y
 * aquí se escribe sobre esa copia: solo "Guardar" la devuelve al catálogo. Cerrar
 * con la cruz, con `Escape` o con "Cancelar" descarta, que es lo que se espera de
 * un modal de configuración y lo que no pasaría si editara el conector vivo.
 *
 * Los campos y los permisos vienen de componentes compartidos con el asistente de
 * alta (`ConnectorFields`, `ScopeList`): son la misma forma sobre el mismo tipo de
 * borrador, y duplicarlos dejaría dos sitios donde añadir un campo.
 */
import { computed } from 'vue';

import { Button } from '@components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@components/ui/dialog';
import { Separator } from '@components/ui/separator';

import ConnectorFields from './ConnectorFields.vue';
import ScopeList from '../views/sources/ScopeList.vue';
import { CONNECTOR_COPY } from '../data/connectors.seed';
import { useConnectors } from '../composables/useConnectors';

const { closeConfig, editing, saveConfig } = useConnectors();

/** El modal se abre y se cierra con el borrador: una sola verdad, como el estudio. */
const open = computed({
  get: () => editing.value !== null,
  set: (value: boolean) => {
    if (!value) closeConfig();
  },
});

function toggleScope(id: string, granted: boolean): void {
  const scope = editing.value?.scopes.find((entry) => entry.id === id);
  if (scope !== undefined) scope.granted = granted;
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="max-w-preview gap-0 overflow-hidden p-0 sm:max-w-preview">
      <DialogHeader class="gap-1 border-b border-line p-5 text-left">
        <DialogTitle>{{ CONNECTOR_COPY.configure }} · {{ editing?.name ?? '' }}</DialogTitle>
        <DialogDescription>{{ CONNECTOR_COPY.connectionHint }}</DialogDescription>
      </DialogHeader>

      <div class="max-h-[70svh] overflow-y-auto p-5">
        <section>
          <h2>{{ CONNECTOR_COPY.fieldSection }}</h2>
          <ConnectorFields
            class="mt-3"
            :fields="editing?.fields ?? []"
            :id-prefix="`connector-${editing?.id ?? 'nuevo'}`"
          />
        </section>

        <Separator class="my-6" />

        <section>
          <h2>{{ CONNECTOR_COPY.scopeSection }}</h2>
          <p class="mt-1 mb-3 text-body-sm text-ink-muted">{{ CONNECTOR_COPY.scopeHint }}</p>
          <ScopeList :scopes="editing?.scopes ?? []" editable @toggle="toggleScope" />
        </section>
      </div>

      <DialogFooter class="border-t border-line p-5 sm:justify-end">
        <Button variant="outline" @click="closeConfig()">{{ CONNECTOR_COPY.cancel }}</Button>
        <Button @click="saveConfig()">{{ CONNECTOR_COPY.finish }}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
