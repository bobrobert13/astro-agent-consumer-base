<script setup lang="ts">
/**
 * @file src/domains/connectors/views/sources/SourceCard.vue
 * @description Una fuente externa del catálogo.
 *
 * Se compone con las primitivas `Card` del registry en vez de con utilidades
 * sueltas: el relleno, el radio y la sombra son los del sistema, y así la tarjeta
 * no es una isla visual dentro de una vista hecha con shadcn. Las dos acciones
 * viven en el pie y son explícitas —configurar y ver el detalle— porque una
 * tarjeta entera pulsable esconde que hay dos destinos distintos.
 *
 * El tono del azulejo **vive aquí y no en el dato**: el contrato dice de qué
 * familia es el conector, no cómo se pinta. Añadir una familia es una entrada en
 * este mapa y otra en `CONNECTOR_ICONS`.
 */
import { computed } from 'vue';

import { Button } from '@components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@components/ui/card';

import SourceStatus from './SourceStatus.vue';
import { CONNECTOR_COPY, CONNECTOR_ICONS } from '../../data/connectors.seed';
import type { Connector, ConnectorKind } from '../../types/connector.types';

interface Props {
  connector: Connector;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  open: [id: string];
  configure: [connector: Connector];
}>();

/** Fondo y tinta por familia, con tokens de concepto: el tema los reasigna. */
const TILE: Record<ConnectorKind, string> = {
  database: 'bg-brand-050 text-brand-600',
  storage: 'bg-elevated text-ink-muted',
  code: 'bg-brand-500/10 text-brand-600',
  messaging: 'bg-warning/15 text-ink',
  docs: 'bg-elevated text-ink',
};

/** Miles con separador local; la cifra es de relleno, el formato no. */
const documents = computed(() => props.connector.documents.toLocaleString('es-ES'));
</script>

<template>
  <Card>
    <CardHeader>
      <div class="flex items-start gap-3">
        <span class="grid size-10 shrink-0 place-items-center rounded-control" :class="TILE[props.connector.kind]">
          <component :is="CONNECTOR_ICONS[props.connector.kind]" class="size-5" aria-hidden="true" />
        </span>

        <div class="min-w-0 flex-1">
          <strong class="block truncate text-label text-ink">{{ props.connector.name }}</strong>
          <small class="block truncate">{{ props.connector.provider }}</small>
        </div>

        <SourceStatus :status="props.connector.status" />
      </div>
    </CardHeader>

    <CardContent>
      <p class="text-body-sm text-ink-muted">{{ props.connector.description }}</p>

      <dl class="mt-4 flex flex-wrap gap-x-8 gap-y-2">
        <div>
          <dt class="text-caption text-ink-muted">{{ CONNECTOR_COPY.documents }}</dt>
          <dd class="text-label text-ink">{{ documents }}</dd>
        </div>
        <div>
          <dt class="text-caption text-ink-muted">{{ CONNECTOR_COPY.lastSync }}</dt>
          <dd class="text-label text-ink">{{ props.connector.lastSync }}</dd>
        </div>
      </dl>
    </CardContent>

    <CardFooter class="flex-wrap justify-between gap-3">
      <small class="min-w-0 flex-1 truncate">{{ props.connector.statusNote }}</small>

      <span class="flex shrink-0 gap-2">
        <Button variant="outline" size="sm" @click="emit('open', props.connector.id)">
          {{ CONNECTOR_COPY.detail }}
        </Button>
        <Button size="sm" @click="emit('configure', props.connector)">
          {{ CONNECTOR_COPY.configure }}
        </Button>
      </span>
    </CardFooter>
  </Card>
</template>
