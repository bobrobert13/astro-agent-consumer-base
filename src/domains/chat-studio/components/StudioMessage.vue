<script setup lang="ts">
/**
 * @file src/domains/chat-studio/components/StudioMessage.vue
 * @description Un globo del transcript.
 *
 * **El `<article>` y la clase `rounded-bubble` son contrato con el gate de
 * verificación**: `scripts/electron-smoke.mjs` mide el texto del transcript con
 * `article .rounded-bubble`. Si se renombran, hay que actualizar el script en el
 * mismo cambio.
 *
 * Esta primera versión pinta solo las partes de texto. Las de herramienta y los
 * avisos (bloqueo del backend, memoria llena) llegan en la fase siguiente, cuando
 * el render por partes se extraiga a su propio componente.
 */
import { computed } from 'vue';

import type { ChatMessage as ChatMessageModel } from '@domains/agent-chat';
import StudioImageSlot from './StudioImageSlot.vue';
import { STUDIO_IMAGE_SLOTS } from '../data/studio.seed';

const props = defineProps<{ message: ChatMessageModel }>();

const text = computed(() =>
  props.message.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('\n\n')
);

const isUser = computed(() => props.message.role === 'user');

/** Puntos suspensivos mientras el globo está abierto y aún no ha llegado texto. */
const isTyping = computed(() => props.message.status === 'streaming' && text.value === '');
</script>

<template>
  <article class="flex gap-3" :class="isUser ? 'flex-row-reverse self-end' : 'self-start'">
    <StudioImageSlot
      v-if="!isUser"
      :name="STUDIO_IMAGE_SLOTS.assistant"
      class="mt-0.5 size-7 rounded-md bg-elevated"
    />

    <p
      class="max-w-measure rounded-bubble px-3.5 py-2.5 text-body break-words"
      :class="isUser ? 'rounded-br-sm bg-brand-500 text-on-brand' : 'rounded-tl-sm bg-elevated text-ink'"
    >
      <span v-if="isTyping" class="inline-flex gap-1 py-1" aria-hidden="true">
        <i v-for="dot in 3" :key="dot" class="size-1.5 animate-blink rounded-full bg-ink-muted" />
      </span>
      <span v-else class="whitespace-pre-wrap">{{ text }}</span>
    </p>
  </article>
</template>
