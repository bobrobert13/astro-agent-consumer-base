<script setup lang="ts">
/**
 * @file src/domains/connectors/views/sources/SourceCard.vue
 * @description Una fuente externa del listado.
 *
 * **Compacta, porque la columna manda.** Aquí se ajusta la **geometría** del
 * `Card` del registry —`gap-0 py-0` y un solo bloque interior `p-3` en vez de
 * `Header`/`Content`/`Footer` con `px-6` y `gap-6`—: su relleno está pensado para
 * una tarjeta de página y, tal cual, cada una medía ~230 px de alto en una columna
 * de 340, con la mitad de aire. El color, el radio y la sombra siguen siendo los
 * del registry; lo que se ajusta es cuánto ocupa. Es el mismo criterio con el que
 * `StudioPreviewDialog` ajusta el relleno de `DialogContent`.
 *
 * **Qué se calla y por qué.** La nota de estado solo se pinta cuando el estado no
 * es "conectada": en una fuente sana repetiría lo que ya dicen la píldora y la
 * fecha de sincronización. La descripción se recorta a dos líneas para que las
 * tarjetas midan lo mismo y la lista se lea de un vistazo; el texto completo está
 * en el detalle, a un clic.
 *
 * El tono del azulejo vive **aquí y no en el dato**: el contrato dice de qué familia
 * es la fuente, no cómo se pinta.
 */
import { computed } from 'vue';

import { Button } from '@components/ui/button';
import { Card } from '@components/ui/card';

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

/** En una fuente sana, la nota no añade nada a la píldora y a la fecha. */
const showNote = computed(() => props.connector.status !== 'connected');
</script>

<template>
  <Card class="gap-0 py-0">
    <div class="flex flex-col gap-2.5 p-3">
      <div class="flex items-start gap-2.5">
        <span class="grid size-9 shrink-0 place-items-center rounded-control" :class="TILE[props.connector.kind]">
          <component :is="CONNECTOR_ICONS[props.connector.kind]" class="size-4" aria-hidden="true" />
        </span>

        <div class="min-w-0 flex-1">
          <strong class="block truncate text-label text-ink">{{ props.connector.name }}</strong>
          <small class="block truncate">{{ props.connector.provider }}</small>
        </div>

        <SourceStatus :status="props.connector.status" />
      </div>

      <p class="line-clamp-2 text-caption text-ink-muted">{{ props.connector.description }}</p>

      <p class="flex min-w-0 items-center gap-1.5 text-caption text-ink-muted">
        <span class="truncate">{{ documents }} {{ CONNECTOR_COPY.documents }}</span>
        <span aria-hidden="true">·</span>
        <span class="truncate">{{ props.connector.lastSync }}</span>
      </p>

      <p v-if="showNote" class="truncate text-caption text-ink-muted">{{ props.connector.statusNote }}</p>

      <div class="flex justify-end gap-2">
        <Button variant="outline" size="xs" @click="emit('open', props.connector.id)">
          {{ CONNECTOR_COPY.detail }}
        </Button>
        <Button size="xs" @click="emit('configure', props.connector)">
          {{ CONNECTOR_COPY.configure }}
        </Button>
      </div>
    </div>
  </Card>
</template>
