<script setup lang="ts">
/**
 * @file src/domains/agent-chat/components/ChatTranscript.vue
 * @description Lista de mensajes + el globo en vuelo, con scroll autocionado.
 *
 * El texto que se está generando se pinta como un mensaje "sintetizado" fuera de
 * la lista. Es la otra mitad de la política de rendimiento de
 * `useChatTranscript`: mientras llegan deltas no se re-renderiza ningún mensaje
 * real, solo este nodo.
 *
 * El autoscroll solo se engancha si el usuario estaba al final: si subió a leer
 * algo anterior, el stream no le devuelve la vista abajo.
 */
import { nextTick, ref, watch } from 'vue';

import ChatMessage from './ChatMessage.vue';
import type { ChatMessage as ChatMessageModel } from '../types/chat.types';

const props = defineProps<{
  messages: ChatMessageModel[];
  streamingText: string;
}>();

defineSlots<{
  empty?: () => unknown;
}>();

const scroller = ref<HTMLElement | null>(null);
const pinned = ref(true);

function onScroll(): void {
  const element = scroller.value;
  if (element === null) return;
  pinned.value = element.scrollHeight - element.scrollTop - element.clientHeight < 80;
}

watch(
  () => [props.messages.length, props.streamingText.length],
  async () => {
    if (!pinned.value) return;
    await nextTick();
    const element = scroller.value;
    if (element !== null) element.scrollTop = element.scrollHeight;
  }
);
</script>

<template>
  <div ref="scroller" class="h-full overflow-y-auto px-4 py-5" @scroll.passive="onScroll">
    <div class="mx-auto flex max-w-3xl flex-col gap-4">
      <slot v-if="messages.length === 0 && streamingText === ''" name="empty" />

      <ChatMessage v-for="message in messages" :key="message.id" :message="message" />

      <ChatMessage
        v-if="streamingText !== ''"
        :message="{
          id: 'streaming',
          role: 'assistant',
          parts: [{ type: 'text', text: streamingText }],
          createdAt: '',
          status: 'streaming',
        }"
      />
    </div>
  </div>
</template>
