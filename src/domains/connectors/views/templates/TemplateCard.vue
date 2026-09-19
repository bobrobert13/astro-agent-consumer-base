<script setup lang="ts">
/**
 * @file src/domains/connectors/views/templates/TemplateCard.vue
 * @description Una plantilla: un flujo guardado que se lanza con un clic.
 *
 * **Compacta como sus hermanas**: `Card` con `gap-0 py-0` y bloque `p-3`,
 * descripción a dos líneas, píldoras de fuentes en línea con su etiqueta y la
 * acción en `xs`. La categoría va en la cabecera como píldora, así que no necesita
 * fila propia.
 *
 * Muestra de dónde se alimenta y cuántos pasos tiene, que es lo que decide si
 * alguien la usa o la ignora. **Sin acción, a propósito**: lanzarla no está
 * implementado, así que la tarjeta no lo promete en vez de avisar de que no hay
 * nada —un botón que solo avisa se lee como una app rota—.
 */
import { LayoutTemplate } from '@lucide/vue';
import { computed } from 'vue';

import { Badge } from '@components/ui/badge';
import { Card } from '@components/ui/card';

import { CONNECTOR_COPY } from '../../data/connectors.seed';
import type { TemplateRow } from '../../types/connector.types';

interface Props {
  template: TemplateRow;
}

const props = defineProps<Props>();

const steps = computed(() => `${props.template.steps} ${CONNECTOR_COPY.steps}`);
</script>

<template>
  <Card class="gap-0 py-0">
    <div class="flex flex-col gap-2.5 p-3">
      <div class="flex items-start gap-2.5">
        <span class="grid size-9 shrink-0 place-items-center rounded-control bg-brand-500/10 text-brand-600">
          <LayoutTemplate class="size-4" aria-hidden="true" />
        </span>

        <div class="min-w-0 flex-1">
          <strong class="block truncate text-label text-ink">{{ props.template.name }}</strong>
          <small class="block truncate">{{ steps }}</small>
        </div>

        <Badge variant="secondary">{{ props.template.category }}</Badge>
      </div>

      <p class="line-clamp-2 text-caption text-ink-muted">{{ props.template.description }}</p>

      <div class="flex min-w-0 flex-wrap items-center gap-1.5">
        <small>{{ CONNECTOR_COPY.sources }}</small>
        <Badge v-for="source in props.template.sources" :key="source" variant="outline">{{ source }}</Badge>
      </div>
    </div>
  </Card>
</template>
