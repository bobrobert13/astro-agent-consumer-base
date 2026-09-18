<script setup lang="ts">
/**
 * @file src/domains/connectors/views/knowledge/KnowledgeCard.vue
 * @description Una base de conocimiento: un conjunto curado de fuentes ya
 * conectadas, listo para consultar sin elegir la fuente cada vez.
 *
 * Los nombres de las fuentes se resuelven desde `connectorIds` en vez de guardarse
 * escritos en la base: así renombrar un conector no deja dos verdades, y el
 * contrato puede seguir describiendo relaciones en lugar de copias.
 *
 * La acción es una sola y honesta: abrir el conjunto todavía no está implementado,
 * así que lo dice en vez de fingir que navega. Es la regla del repositorio para
 * los esqueletos —avisar, no callar—.
 */
import { BookOpenCheck } from '@lucide/vue';
import { computed } from 'vue';

import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@components/ui/card';

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
  <Card>
    <CardHeader>
      <div class="flex items-start gap-3">
        <span class="grid size-10 shrink-0 place-items-center rounded-control bg-brand-050 text-brand-600">
          <BookOpenCheck class="size-5" aria-hidden="true" />
        </span>

        <div class="min-w-0 flex-1">
          <strong class="block truncate text-label text-ink">{{ props.base.name }}</strong>
          <small class="block truncate">{{ props.base.updatedAt }}</small>
        </div>
      </div>
    </CardHeader>

    <CardContent>
      <p class="text-body-sm text-ink-muted">{{ props.base.description }}</p>

      <p class="mt-4 mb-1.5 text-caption text-ink-muted">{{ CONNECTOR_COPY.sources }}</p>
      <div class="flex flex-wrap gap-1.5">
        <Badge v-for="source in sources" :key="source" variant="outline">{{ source }}</Badge>
      </div>
    </CardContent>

    <CardFooter class="flex-wrap justify-between gap-3">
      <small>{{ documents }} {{ CONNECTOR_COPY.documents }}</small>
      <Button size="sm" @click="notYet(CONNECTOR_COPY.open)">{{ CONNECTOR_COPY.open }}</Button>
    </CardFooter>
  </Card>
</template>
