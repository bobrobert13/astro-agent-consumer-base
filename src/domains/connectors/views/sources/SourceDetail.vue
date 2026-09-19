<script setup lang="ts">
/**
 * @file src/domains/connectors/views/sources/SourceDetail.vue
 * @description Detalle de una fuente externa: qué es, qué ha indexado, qué permisos
 * tiene y a qué se puede ir desde aquí.
 *
 * **Es un panel dentro de la sección, no un modal.** El modal está reservado para la
 * configuración, y separar "ver" de "editar" evita el malentendido clásico: quien
 * abre el detalle suele estar comprobando qué se va a leer, no cambiando una
 * credencial.
 *
 * **Compacto y en una columna.** Los pares etiqueta/valor van en línea
 * (`justify-between`) y no en rejilla de dos columnas: en 340 px la columna se queda
 * en ~120 px y "Última sincronización" ya no cabía, así que la rejilla obligaba a
 * partir las etiquetas en dos líneas. Las acciones bajan a `xs` y envuelven en dos
 * filas como mucho.
 *
 * Los secretos no se pintan **ni aquí**: un valor que se enseña en pantalla deja de
 * ser secreto, y esta vista no tiene nada que la autorice a mostrarlo.
 */
import { ArrowLeft, RefreshCw, Settings2 } from '@lucide/vue';
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

const { closeDetail, loading, openConfig, refresh } = useConnectors();

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
  <section :aria-label="props.connector.name" class="flex flex-col gap-3">
    <Button variant="ghost" size="xs" class="self-start" @click="closeDetail()">
      <ArrowLeft aria-hidden="true" />
      {{ CONNECTOR_COPY.backToList }}
    </Button>

    <header class="flex items-start gap-2.5">
      <span class="grid size-10 shrink-0 place-items-center rounded-control bg-brand-050 text-brand-600">
        <component :is="icon" class="size-5" aria-hidden="true" />
      </span>

      <div class="min-w-0 flex-1">
        <strong class="block truncate text-label text-ink">{{ props.connector.name }}</strong>
        <small class="block truncate">{{ props.connector.provider }}</small>
      </div>

      <SourceStatus :status="props.connector.status" />
    </header>

    <p class="text-caption text-ink-muted">{{ props.connector.description }}</p>

    <dl class="flex flex-col gap-1.5 rounded-panel border border-line bg-surface p-3">
      <div class="flex items-baseline justify-between gap-3">
        <dt class="text-caption text-ink-muted">{{ CONNECTOR_COPY.documents }}</dt>
        <dd class="truncate text-label text-ink">{{ documents }}</dd>
      </div>
      <div class="flex items-baseline justify-between gap-3">
        <dt class="text-caption text-ink-muted">{{ CONNECTOR_COPY.lastSync }}</dt>
        <dd class="truncate text-label text-ink">{{ props.connector.lastSync }}</dd>
      </div>
      <div class="flex items-baseline justify-between gap-3">
        <dt class="shrink-0 text-caption text-ink-muted">{{ CONNECTOR_COPY.status }}</dt>
        <dd class="truncate text-right text-label text-ink">{{ props.connector.statusNote }}</dd>
      </div>
    </dl>

    <!--
      Dos acciones, y las dos hacen algo: "Sincronizar ahora" recarga de verdad
      —levanta el estado de carga de la cabecera y refresca la fecha— y "Configurar"
      abre su modal. Las que no tenían destino (ver documentación, quitar) se fueron
      con el aviso: un botón que promete algo y no lo cumple se lee como una app
      rota.
    -->
    <div class="flex flex-wrap gap-1.5">
      <Button size="xs" @click="openConfig(props.connector)">
        <Settings2 aria-hidden="true" />
        {{ CONNECTOR_COPY.configure }}
      </Button>
      <Button variant="outline" size="xs" :disabled="loading" @click="refresh()">
        <RefreshCw :class="loading ? 'animate-spin' : ''" aria-hidden="true" />
        {{ CONNECTOR_COPY.sync }}
      </Button>
    </div>

    <section>
      <h2 class="text-label text-ink">{{ CONNECTOR_COPY.fieldSection }}</h2>
      <dl class="mt-2 flex flex-col gap-1.5">
        <div v-for="field in props.connector.fields" :key="field.id" class="flex items-baseline justify-between gap-3">
          <dt class="shrink-0 text-caption text-ink-muted">{{ field.label }}</dt>
          <dd class="truncate text-label text-ink">{{ displayValue(field) }}</dd>
        </div>
      </dl>
    </section>

    <section>
      <h2 class="text-label text-ink">{{ CONNECTOR_COPY.scopeSection }}</h2>
      <p class="mt-0.5 mb-2 text-caption text-ink-muted">{{ CONNECTOR_COPY.scopeHint }}</p>
      <ScopeList :scopes="props.connector.scopes" />
    </section>
  </section>
</template>
