<script setup lang="ts">
/**
 * @file src/domains/connectors/views/knowledge/KnowledgeCard.vue
 * @description Una base de conocimiento: un conjunto curado de fuentes ya
 * conectadas, listo para consultar sin elegir la fuente cada vez.
 *
 * **Compacta como la tarjeta de fuentes**: `Card` con `gap-0 py-0` y un bloque
 * `p-3` interior, descripción recortada a dos líneas y acciones en `xs`. La
 * etiqueta de fuentes va **en la misma línea** que sus píldoras —y no encima— porque
 * con una sola fuente la etiqueta sola ocupaba una fila entera.
 *
 * Los nombres de las fuentes se resuelven desde `connectorIds` en vez de guardarse
 * escritos: así renombrar una fuente no deja dos verdades, y el contrato puede
 * seguir describiendo relaciones en lugar de copias.
 *
 * La acción es una sola y honesta: abrir el conjunto todavía no está implementado,
 * así que lo dice en vez de fingir que navega.
 */
import { BookOpenCheck } from '@lucide/vue';
import { computed } from 'vue';

import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import { Card } from '@components/ui/card';

import { CONNECTOR_COPY, CONNECTORS } from '../../data/connectors.seed';
import { useConnectors } from '../../composables/useConnectors';
import type { KnowledgeBase } from '../../types/connector.types';

interface Props {
  base: KnowledgeBase;
}

const props = defineProps<Props>();

const { notYet } = useConnectors();

const sources = computed(() =>
  props.base.connectorIds.map((id) => CONNECTORS.find((connector) => connector.id === id)?.name ?? id)
);

const documents = computed(() => props.base.documents.toLocaleString('es-ES'));
</script>

<template>
  <Card class="gap-0 py-0">
    <div class="flex flex-col gap-2.5 p-3">
      <div class="flex items-start gap-2.5">
        <span class="grid size-9 shrink-0 place-items-center rounded-control bg-brand-050 text-brand-600">
          <BookOpenCheck class="size-4" aria-hidden="true" />
        </span>

        <div class="min-w-0 flex-1">
          <strong class="block truncate text-label text-ink">{{ props.base.name }}</strong>
          <small class="block truncate">{{ props.base.updatedAt }}</small>
        </div>
      </div>

      <p class="line-clamp-2 text-caption text-ink-muted">{{ props.base.description }}</p>

      <div class="flex min-w-0 flex-wrap items-center gap-1.5">
        <small>{{ CONNECTOR_COPY.sources }}</small>
        <Badge v-for="source in sources" :key="source" variant="outline">{{ source }}</Badge>
      </div>

      <div class="flex items-center justify-between gap-2">
        <small>{{ documents }} {{ CONNECTOR_COPY.documents }}</small>
        <Button size="xs" @click="notYet(CONNECTOR_COPY.open)">{{ CONNECTOR_COPY.open }}</Button>
      </div>
    </div>
  </Card>
</template>
