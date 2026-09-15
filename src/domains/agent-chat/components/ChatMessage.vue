<script setup lang="ts">
/**
 * @file src/domains/agent-chat/components/ChatMessage.vue
 * @description Un globo del transcript.
 *
 * `v-memo` sobre el mensaje cerrado es lo que mantiene barato el scroll durante
 * un stream: si no, cada frame de texto en vuelo re-difunde el subtree de todos
 * los mensajes anteriores. Los que ya tienen `status !== 'streaming'` no cambian
 * nunca más, así que la dependencia `[message.id, message.status]` es suficiente.
 */
import { defineAsyncComponent } from 'vue';

import type { ChatMessage } from '../types/chat.types';

defineProps<{ message: ChatMessage }>();

defineSlots<{
  actions?: () => unknown;
}>();

const MarkdownBlock = defineAsyncComponent(() => import('./MarkdownBlock.vue'));
const ToolCallCard = defineAsyncComponent(() => import('./ToolCallCard.vue'));
</script>

<template>
  <article
    v-memo="[message.id, message.status]"
    class="flex flex-col gap-1"
    :class="message.role === 'user' ? 'items-end' : 'items-start'"
  >
    <div
      class="max-w-[85ch] rounded-bubble px-4 py-2.5"
      :class="message.role === 'user' ? 'bg-brand-500 text-white' : 'border border-line bg-surface'"
    >
      <template v-for="(part, index) in message.parts" :key="index">
        <ToolCallCard v-if="part.type === 'tool-call'" :tool-name="part.toolName" :args="part.args" />
        <MarkdownBlock v-else :text="part.text" />
      </template>

      <p v-if="message.status === 'error' && message.error" class="mt-1 text-xs text-danger">
        {{ message.error }}
      </p>
      <p v-else-if="message.status === 'aborted'" class="mt-1 text-xs text-ink-muted">
        {{ message.error ?? 'Respuesta cancelada.' }}
      </p>
    </div>

    <div v-if="$slots.actions" class="flex items-center gap-1 px-1">
      <slot name="actions" />
    </div>
  </article>
</template>
