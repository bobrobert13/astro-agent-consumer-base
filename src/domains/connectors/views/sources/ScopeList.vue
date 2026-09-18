<script setup lang="ts">
/**
 * @file src/domains/connectors/views/sources/ScopeList.vue
 * @description Permisos de un conector: en lectura o editables.
 *
 * Un solo componente para los dos sitios donde se ven —el detalle y el modal de
 * configuración— porque la forma es la misma y solo cambia si se puede tocar.
 * Duplicarlo dejaría la descripción de un permiso divergiendo entre lo que se
 * concede y lo que se lee, que es justo donde no conviene tener dos textos.
 */
import { Badge } from '@components/ui/badge';
import { Switch } from '@components/ui/switch';

import { CONNECTOR_COPY } from '../../data/connectors.seed';
import type { ConnectorScope } from '../../types/connector.types';

interface Props {
  scopes: ConnectorScope[];
  /** Con `true` cada permiso lleva su conmutador en vez de su distintivo. */
  editable?: boolean | undefined;
}

const props = withDefaults(defineProps<Props>(), { editable: false });

const emit = defineEmits<{
  toggle: [id: string, granted: boolean];
}>();
</script>

<template>
  <ul class="flex flex-col gap-3">
    <li
      v-for="scope in props.scopes"
      :key="scope.id"
      class="flex items-start gap-3 rounded-panel border border-line bg-surface p-3"
    >
      <span class="flex min-w-0 flex-1 flex-col gap-0.5">
        <strong class="text-label text-ink">{{ scope.label }}</strong>
        <small>{{ scope.description }}</small>
      </span>

      <Switch
        v-if="props.editable"
        :model-value="scope.granted"
        :aria-label="scope.label"
        @update:model-value="(value) => emit('toggle', scope.id, value)"
      />
      <Badge v-else :variant="scope.granted ? 'default' : 'outline'">
        {{ scope.granted ? CONNECTOR_COPY.granted : CONNECTOR_COPY.denied }}
      </Badge>
    </li>
  </ul>
</template>
