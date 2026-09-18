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
 * El tipo del campo decide el control: texto, número, secreto (mismo `Input`, con
 * el valor sin mostrar), selector y conmutador. Añadir un campo a la semilla no
 * toca este componente mientras su tipo sea uno de esos.
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
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@components/ui/select';
import { Separator } from '@components/ui/separator';
import { Switch } from '@components/ui/switch';

import ScopeList from '../views/sources/ScopeList.vue';
import { CONNECTOR_COPY } from '../data/connectors.seed';
import { useConnectors } from '../composables/useConnectors';
import type { ConnectorField, ConnectorFieldType } from '../types/connector.types';

const { closeConfig, editing, saveConfig } = useConnectors();

/** El modal se abre y se cierra con el borrador: una sola verdad, como el estudio. */
const open = computed({
  get: () => editing.value !== null,
  set: (value: boolean) => {
    if (!value) closeConfig();
  },
});

/**
 * Un solo escritor para los tres tipos de control. El parámetro es `unknown` a
 * propósito: `Select` emite la unión ancha de reka-ui y `Input` emite
 * `string | number`, así que normalizar aquí evita repetir un cast en cada
 * plantilla y deja el dato siempre en `string | boolean`, que es lo que dice el
 * contrato.
 */
function setField(field: ConnectorField, value: unknown): void {
  field.value = typeof value === 'boolean' ? value : String(value ?? '');
}

function textOf(field: ConnectorField): string {
  return typeof field.value === 'string' ? field.value : '';
}

function inputType(type: ConnectorFieldType): string {
  if (type === 'secret') return 'password';
  if (type === 'number') return 'number';
  return 'text';
}

/** Id estable por conector y campo: es lo que ata cada `<label>` a su control. */
function fieldId(field: ConnectorField): string {
  return `connector-${editing.value?.id ?? 'nuevo'}-${field.id}`;
}

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

          <div class="mt-3 flex flex-col gap-4">
            <div v-for="field in editing?.fields ?? []" :key="field.id" class="flex flex-col gap-2">
              <Label :for="fieldId(field)">
                <span>{{ field.label }}</span>
                <span v-if="field.required === true" class="text-danger" aria-hidden="true">*</span>
              </Label>

              <Switch
                v-if="field.type === 'switch'"
                :id="fieldId(field)"
                :model-value="field.value === true"
                @update:model-value="(value) => setField(field, value)"
              />

              <Select
                v-else-if="field.type === 'select'"
                :model-value="textOf(field)"
                @update:model-value="(value) => setField(field, value)"
              >
                <SelectTrigger :id="fieldId(field)" class="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="option in field.options ?? []" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </SelectItem>
                </SelectContent>
              </Select>

              <Input
                v-else
                :id="fieldId(field)"
                :type="inputType(field.type)"
                :model-value="textOf(field)"
                :placeholder="field.placeholder"
                @update:model-value="(value) => setField(field, value)"
              />

              <small v-if="field.help !== undefined">{{ field.help }}</small>
            </div>
          </div>
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
