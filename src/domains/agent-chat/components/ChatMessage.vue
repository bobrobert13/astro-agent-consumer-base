<script setup lang="ts">
/**
 * @file src/domains/agent-chat/components/ChatMessage.vue
 * @description Un globo del transcript.
 *
 * `v-memo` es lo que mantiene barato el scroll durante un stream: si no, cada
 * frame de texto en vuelo re-difunde el subtree de todos los mensajes anteriores.
 * Los globos cerrados no cambian nunca más, así que sus dependencias son
 * estables y Vue los salta; el que está en vuelo cambia en cada frame porque
 * `chat.memo.ts` incluye la longitud del texto entre las dependencias.
 *
 * El tamaño sale de la escala de `theme.css` (`text-body`, `text-caption`), no
 * de utilidades sueltas: el rango tipográfico se declara una vez y aquí solo se
 * elige el rango.
 */
import { computed, defineAsyncComponent } from 'vue';

import { messageMemoDeps } from './chat.memo';
import type { ChatMessage } from '../types/chat.types';

const props = defineProps<{ message: ChatMessage }>();

defineSlots<{
  actions?: () => unknown;
}>();

const memoDeps = computed(() => messageMemoDeps(props.message));

const MarkdownBlock = defineAsyncComponent(() => import('./MarkdownBlock.vue'));
const ToolCallCard = defineAsyncComponent(() => import('./ToolCallCard.vue'));
</script>

<template>
  <article
    v-memo="memoDeps"
    class="flex flex-col gap-1"
    :class="message.role === 'user' ? 'items-end' : 'items-start'"
  >
    <div
      class="max-w-measure rounded-bubble px-4 py-2.5 text-body"
      :class="message.role === 'user' ? 'bg-brand-500 text-on-brand' : 'border border-line bg-surface'"
    >
      <template v-for="(part, index) in message.parts" :key="index">
        <ToolCallCard v-if="part.type === 'tool-call'" :tool-name="part.toolName" :args="part.args" />
        <div v-else-if="part.type === 'notice'" class="rounded-panel border border-line bg-elevated px-3 py-2">
          <p class="text-body-sm text-warning">{{ part.text }}</p>
          <p v-if="part.detail" class="mt-1 text-caption text-ink-muted">{{ part.detail }}</p>
        </div>
        <MarkdownBlock v-else :text="part.text" />
      </template>

      <p v-if="message.status === 'error' && message.error" class="mt-1 text-caption text-danger">
        {{ message.error }}
      </p>
      <p v-else-if="message.status === 'aborted'" class="mt-1 text-caption text-ink-muted">
        {{ message.error ?? 'Respuesta cancelada.' }}
      </p>
    </div>

    <div v-if="$slots.actions" class="flex items-center gap-1 px-1">
      <slot name="actions" />
    </div>
  </article>
</template>
