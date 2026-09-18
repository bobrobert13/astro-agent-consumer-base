<script setup lang="ts">
/**
 * @file src/domains/connectors/views/templates/TemplateCard.vue
 * @description Una plantilla: un flujo guardado que se lanza con un clic.
 *
 * Muestra de dónde se alimenta (`sources`) y cuántos pasos tiene, que es lo que
 * decide si alguien la usa o la ignora. Como en base de conocimiento, lanzarla
 * todavía no está implementado y la tarjeta lo dice en vez de fingirlo.
 */
import { LayoutTemplate } from '@lucide/vue';
import { computed } from 'vue';

import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@components/ui/card';

import { CONNECTOR_COPY } from '../../data/connectors.seed';
import { useConnectors } from '../../composables/useConnectors';
import type { TemplateRow } from '../../types/connector.types';

interface Props {
  template: TemplateRow;
}

const props = defineProps<Props>();

const { notYet } = useConnectors();

const steps = computed(() => `${props.template.steps} ${CONNECTOR_COPY.steps}`);
</script>

<template>
  <Card>
    <CardHeader>
      <div class="flex items-start gap-3">
        <span class="grid size-10 shrink-0 place-items-center rounded-control bg-brand-500/10 text-brand-600">
          <LayoutTemplate class="size-5" aria-hidden="true" />
        </span>

        <div class="min-w-0 flex-1">
          <strong class="block truncate text-label text-ink">{{ props.template.name }}</strong>
          <small class="block truncate">{{ steps }}</small>
        </div>

        <Badge variant="secondary">{{ props.template.category }}</Badge>
      </div>
    </CardHeader>

    <CardContent>
      <p class="text-body-sm text-ink-muted">{{ props.template.description }}</p>

      <p class="mt-4 mb-1.5 text-caption text-ink-muted">{{ CONNECTOR_COPY.sources }}</p>
      <div class="flex flex-wrap gap-1.5">
        <Badge v-for="source in props.template.sources" :key="source" variant="outline">{{ source }}</Badge>
      </div>
    </CardContent>

    <CardFooter class="justify-end">
      <Button size="sm" @click="notYet(CONNECTOR_COPY.use)">{{ CONNECTOR_COPY.use }}</Button>
    </CardFooter>
  </Card>
</template>
