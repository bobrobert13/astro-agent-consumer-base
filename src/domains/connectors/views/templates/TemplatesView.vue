<script setup lang="ts">
/**
 * @file src/domains/connectors/views/templates/TemplatesView.vue
 * @description Sección de plantillas: los flujos guardados.
 *
 * Misma forma que la base de conocimiento —rejilla de tarjetas, un solo nivel—,
 * pero agrupada por categoría en la propia tarjeta: aquí lo que se compara es
 * *qué hace* cada flujo y sobre qué fuentes, no una jerarquía.
 */
import TemplateCard from './TemplateCard.vue';
import { CONNECTOR_COPY, TEMPLATES } from '../../data/connectors.seed';
</script>

<template>
  <section aria-label="Plantillas" class="flex flex-col gap-4">
    <p class="text-body-sm text-ink-muted">{{ CONNECTOR_COPY.templatesHint }}</p>

    <ul class="grid gap-5 nav:grid-cols-2">
      <li v-for="template in TEMPLATES" :key="template.id">
        <TemplateCard :template="template" />
      </li>
    </ul>
  </section>
</template>
