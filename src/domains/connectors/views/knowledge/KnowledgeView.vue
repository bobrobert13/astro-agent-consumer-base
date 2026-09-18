<script setup lang="ts">
/**
 * @file src/domains/connectors/views/knowledge/KnowledgeView.vue
 * @description Sección de base de conocimiento: los conjuntos de fuentes.
 *
 * Es una rejilla de tarjetas y no una tabla porque lo que se compara de un vistazo
 * no son cifras alineadas, sino a qué sabe responder cada conjunto. El contador de
 * documentos está en la tarjeta, junto a las fuentes que lo componen.
 */
import KnowledgeCard from './KnowledgeCard.vue';
import { CONNECTOR_COPY, KNOWLEDGE_BASES } from '../../data/connectors.seed';
</script>

<template>
  <section aria-label="Base de conocimiento" class="flex flex-col gap-4">
    <p class="text-body-sm text-ink-muted">{{ CONNECTOR_COPY.knowledgeHint }}</p>

    <ul class="flex flex-col gap-4">
      <li v-for="base in KNOWLEDGE_BASES" :key="base.id">
        <KnowledgeCard :base="base" />
      </li>
    </ul>
  </section>
</template>
