<script setup lang="ts">
/**
 * @file src/domains/connectors/components/ConnectorFields.vue
 * @description Los campos de conexión de un conector, como formulario.
 *
 * Es el mismo bloque en el asistente de alta y en el modal de configuración —los
 * dos editan un borrador con la misma forma—, así que vive aparte: el tipo del
 * campo decide el control (texto, número, secreto, selector y conmutador) y añadir
 * un campo a la semilla no toca este componente.
 *
 * **Escribe sobre el borrador que recibe** (`field.value`) en vez de emitir: el
 * borrador es una copia que solo tiene el modal, y esa es justo la razón de que
 * cancelar no deje rastro. Emitir aquí obligaría a cada consumidor a mantener otra
 * copia intermedia, que es donde aparecen las divergencias.
 *
 * El `idPrefix` no es decorativo: dos formularios con los mismos `id` en la misma
 * página dejarían las etiquetas apuntando al control del otro.
 */
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@components/ui/select';
import { Switch } from '@components/ui/switch';

import type { ConnectorField, ConnectorFieldType } from '../types/connector.types';

interface Props {
  fields: ConnectorField[];
  idPrefix: string;
}

const props = defineProps<Props>();

/**
 * Un solo escritor para los tres tipos de control. El parámetro es `unknown` a
 * propósito: `Select` emite la unión ancha de reka-ui y `Input` emite
 * `string | number`, así que normalizar aquí evita repetir un cast en cada
 * plantilla y deja el dato siempre en `string | boolean`, que es lo que dice el
 * contrato.
 */
function setValue(field: ConnectorField, value: unknown): void {
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

function fieldId(field: ConnectorField): string {
  return `${props.idPrefix}-${field.id}`;
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div v-for="field in props.fields" :key="field.id" class="flex flex-col gap-2">
      <Label :for="fieldId(field)">
        <span>{{ field.label }}</span>
        <span v-if="field.required === true" class="text-danger" aria-hidden="true">*</span>
      </Label>

      <Switch
        v-if="field.type === 'switch'"
        :id="fieldId(field)"
        :model-value="field.value === true"
        @update:model-value="(value) => setValue(field, value)"
      />

      <Select
        v-else-if="field.type === 'select'"
        :model-value="textOf(field)"
        @update:model-value="(value) => setValue(field, value)"
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
        @update:model-value="(value) => setValue(field, value)"
      />

      <small v-if="field.help !== undefined">{{ field.help }}</small>
    </div>
  </div>
</template>
