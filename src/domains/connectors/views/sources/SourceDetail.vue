<script setup lang="ts">
/**
 * @file src/domains/connectors/views/sources/SourceDetail.vue
 * @description Detalle de una fuente externa: qué es, qué ha indexado, qué
 * permisos tiene y a qué se puede ir desde aquí.
 *
 * **Es un panel dentro de la pestaña, no un modal.** El modal está reservado para
 * la configuración, y separar "ver" de "editar" evita el malentendido clásico:
 * quien abre el detalle de un conector suele estar comprobando qué se va a leer,
 * no cambiando una credencial.
 *
 * Los valores se enseñan en modo lectura, incluidos los campos que en el modal son
 * controles. Los secretos no se pintan **ni aquí**: un valor que se enseña en
 * pantalla deja de ser secreto, y esta vista no tiene nada que la autorice a
 * mostrarlo.
 */
import { ArrowLeft, ExternalLink, RefreshCw, Settings2, Trash2 } from '@lucide/vue';
import { computed } from 'vue';

import { Button } from '@components/ui/button';

import ScopeList from './ScopeList.vue';
import SourceStatus from './SourceStatus.vue';
import { CONNECTOR_COPY, CONNECTOR_ICONS } from '../../data/connectors.seed';
import { useConnectors } from '../../composables/useConnectors';
import type { Connector, ConnectorField } from '../../types/connector.types';

interface Props {
  connector: Connector;
}

const props = defineProps<Props>();

const { closeDetail, notYet, openConfig } = useConnectors();

const icon = computed(() => CONNECTOR_ICONS[props.connector.kind]);
const documents = computed(() => props.connector.documents.toLocaleString('es-ES'));

/** Un valor por tipo, sin que ningún secreto llegue al DOM. */
function displayValue(field: ConnectorField): string {
  if (field.type === 'secret') return field.value === '' ? CONNECTOR_COPY.secretUnset : CONNECTOR_COPY.secretSet;
  if (field.type === 'switch') return field.value === true ? CONNECTOR_COPY.switchOn : CONNECTOR_COPY.switchOff;
  return field.value === '' ? CONNECTOR_COPY.secretUnset : String(field.value);
}
</script>

<template>
  <section :aria-label="props.connector.name" class="flex flex-col gap-5">
    <Button variant="ghost" size="sm" class="self-start" @click="closeDetail()">
      <ArrowLeft aria-hidden="true" />
      {{ CONNECTOR_COPY.backToList }}
    </Button>

    <header class="flex flex-wrap items-start gap-4">
      <span class="grid size-12 shrink-0 place-items-center rounded-control bg-brand-050 text-brand-600">
        <component :is="icon" class="size-6" aria-hidden="true" />
      </span>

      <div class="min-w-0 flex-1">
        <strong class="block text-title-sm">{{ props.connector.name }}</strong>
        <small class="block">{{ props.connector.provider }}</small>
      </div>

      <SourceStatus :status="props.connector.status" />
    </header>

    <p class="text-body-sm text-ink-muted">{{ props.connector.description }}</p>

    <dl class="grid gap-4 rounded-panel border border-line bg-surface p-4 nav:grid-cols-3">
      <div>
        <dt class="text-caption text-ink-muted">{{ CONNECTOR_COPY.documents }}</dt>
        <dd class="text-label text-ink">{{ documents }}</dd>
      </div>
      <div>
        <dt class="text-caption text-ink-muted">{{ CONNECTOR_COPY.lastSync }}</dt>
        <dd class="text-label text-ink">{{ props.connector.lastSync }}</dd>
      </div>
      <div>
        <dt class="text-caption text-ink-muted">{{ CONNECTOR_COPY.status }}</dt>
        <dd class="text-label text-ink">{{ props.connector.statusNote }}</dd>
      </div>
    </dl>

    <div class="flex flex-wrap gap-2">
      <Button size="sm" @click="openConfig(props.connector)">
        <Settings2 aria-hidden="true" />
        {{ CONNECTOR_COPY.configure }}
      </Button>
      <Button variant="outline" size="sm" @click="notYet(CONNECTOR_COPY.sync)">
        <RefreshCw aria-hidden="true" />
        {{ CONNECTOR_COPY.sync }}
      </Button>
      <Button variant="outline" size="sm" @click="notYet(CONNECTOR_COPY.docs)">
        <ExternalLink aria-hidden="true" />
        {{ CONNECTOR_COPY.docs }}
      </Button>
      <Button variant="outline" size="sm" class="text-danger" @click="notYet(CONNECTOR_COPY.remove)">
        <Trash2 aria-hidden="true" />
        {{ CONNECTOR_COPY.remove }}
      </Button>
    </div>

    <section>
      <h2>{{ CONNECTOR_COPY.fieldSection }}</h2>
      <dl class="mt-3 grid gap-3 nav:grid-cols-2">
        <div v-for="field in props.connector.fields" :key="field.id" class="flex flex-col gap-0.5">
          <dt class="text-caption text-ink-muted">{{ field.label }}</dt>
          <dd class="truncate text-label text-ink">{{ displayValue(field) }}</dd>
        </div>
      </dl>
    </section>

    <section>
      <h2>{{ CONNECTOR_COPY.scopeSection }}</h2>
      <p class="mt-1 mb-3 text-body-sm text-ink-muted">{{ CONNECTOR_COPY.scopeHint }}</p>
      <ScopeList :scopes="props.connector.scopes" />
    </section>
  </section>
</template>
