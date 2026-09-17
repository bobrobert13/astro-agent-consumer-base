<script setup lang="ts">
/**
 * @file src/domains/chat-studio/components/StudioMessage.vue
 * @description Un globo del transcript.
 *
 * `v-memo` es lo que mantiene barato el scroll durante un stream: si no, cada
 * frame de texto en vuelo re-difunde el subtree de todos los mensajes anteriores.
 * Los globos cerrados no cambian nunca más, así que sus dependencias son
 * estables y Vue los salta; el que está en vuelo cambia en cada frame porque
 * `studio.memo.ts` incluye la longitud del texto entre las dependencias.
 *
 * **El `<article>` y la clase `rounded-bubble` son contrato con el gate de
 * verificación**: `scripts/electron-smoke.mjs` mide el texto del transcript con
 * `article .rounded-bubble`. Si se renombran, hay que actualizar el script en el
 * mismo cambio.
 *
 * `StudioMarkdown` y `StudioToolCall` entran por `defineAsyncComponent`: son
 * piezas que no aparecen en la mayoría de los globos y no tienen por qué estar en
 * el chunk inicial.
 */
import { computed, defineAsyncComponent } from 'vue';

import type { ChatMessage as ChatMessageModel } from '@domains/agent-chat';
import StudioImageSlot from './StudioImageSlot.vue';
import StudioNotice from './StudioNotice.vue';
import { messageMemoDeps, messageTextLength } from './studio.memo';
import { STUDIO_IMAGE_SLOTS } from '../data/studio.seed';

const props = defineProps<{ message: ChatMessageModel }>();

const memoDeps = computed(() => messageMemoDeps(props.message));

const isUser = computed(() => props.message.role === 'user');

/** Puntos suspensivos mientras el globo está abierto y aún no ha llegado texto. */
const isTyping = computed(
  () => props.message.status === 'streaming' && messageTextLength(props.message) === 0
);

const StudioMarkdown = defineAsyncComponent(() => import('./StudioMarkdown.vue'));
const StudioToolCall = defineAsyncComponent(() => import('./StudioToolCall.vue'));
</script>

<template>
  <article
    v-memo="memoDeps"
    class="flex gap-3"
    :class="isUser ? 'flex-row-reverse self-end' : 'self-start'"
  >
    <StudioImageSlot
      v-if="!isUser"
      :name="STUDIO_IMAGE_SLOTS.assistant"
      class="mt-0.5 size-7 rounded-md bg-elevated"
    />

    <div class="flex min-w-0 flex-col gap-1" :class="isUser ? 'items-end' : 'items-start'">
      <div
        class="max-w-measure rounded-bubble px-3.5 py-2.5 text-body break-words"
        :class="isUser ? 'rounded-br-sm bg-brand-500 text-on-brand' : 'rounded-tl-sm bg-elevated text-ink'"
      >
        <span v-if="isTyping" class="inline-flex gap-1 py-1" aria-hidden="true">
          <i v-for="dot in 3" :key="dot" class="size-1.5 animate-blink rounded-full bg-ink-muted" />
        </span>

        <template v-else>
          <template v-for="(part, index) in props.message.parts" :key="index">
            <StudioToolCall v-if="part.type === 'tool-call'" :tool-name="part.toolName" :args="part.args" />
            <StudioNotice v-else-if="part.type === 'notice'" :text="part.text" :detail="part.detail" />
            <StudioMarkdown v-else :text="part.text" />
          </template>
        </template>

        <p
          v-if="props.message.status === 'error' && props.message.error !== undefined"
          class="mt-1 text-caption text-danger"
        >
          {{ props.message.error }}
        </p>
        <p v-else-if="props.message.status === 'aborted'" class="mt-1 text-caption text-ink-muted">
          {{ props.message.error ?? 'Respuesta cancelada.' }}
        </p>
      </div>
    </div>
  </article>
</template>
