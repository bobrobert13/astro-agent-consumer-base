<script setup lang="ts">
/**
 * @file src/domains/chat-studio/components/StudioThread.vue
 * @description Transcript: la lista de mensajes más el globo en vuelo, con scroll
 * autocionado.
 *
 * El texto que se está generando se pinta como un mensaje sintetizado fuera de la
 * lista. Es la mitad visual de la política de rendimiento de `adapt-ui-messages`:
 * mientras llegan deltas no se vuelve a renderizar ningún globo cerrado.
 *
 * El autoscroll solo se engancha si el usuario estaba al final: si subió a leer
 * algo anterior, el stream no le devuelve la vista abajo.
 *
 * **`ScrollArea` y no `overflow-y-auto`**: reka-ui pone el `overflow` en su propio
 * viewport, no en el elemento raíz, así que el listener de scroll va sobre ese
 * nodo —el evento `scroll` no burbujea y no llegaría a la raíz— y `scrollTop` se
 * escribe en el viewport, no en el root, que solo recorta.
 */
import { nextTick, onMounted, onScopeDispose, computed, ref, watch } from 'vue';

import { ScrollArea } from '@components/ui/scroll-area';
import { useAgentChat, type ChatMessage as ChatMessageModel } from '@domains/agent-chat';
import StudioMessage from './StudioMessage.vue';

const { messages, streamingText } = useAgentChat();

const area = ref<InstanceType<typeof ScrollArea> | null>(null);
let viewport: HTMLElement | null = null;
const pinned = ref(true);

/**
 * El registry no reenvía el `expose` de reka-ui (`viewportElement`) y sus
 * archivos no se editan a mano, así que el viewport se localiza por el atributo
 * con el que reka lo marca. Es la única costura frágil de este componente: si
 * reka renombra ese atributo, el autoscroll deja de funcionar y sigue todo lo
 * demás; lo cubre `npm run verify:electron`.
 */
function findViewport(): HTMLElement | null {
  const root: unknown = area.value?.$el;
  if (!(root instanceof HTMLElement)) return null;
  return root.querySelector<HTMLElement>('[data-slot="scroll-area-viewport"]');
}

function onScroll(): void {
  const element = viewport;
  if (element === null) return;
  pinned.value = element.scrollHeight - element.scrollTop - element.clientHeight < 80;
}

onMounted(() => {
  viewport = findViewport();
  viewport?.addEventListener('scroll', onScroll, { passive: true });
});

onScopeDispose(() => {
  viewport?.removeEventListener('scroll', onScroll);
  viewport = null;
});

watch(
  () => [messages.value.length, streamingText.value.length],
  async () => {
    if (!pinned.value) return;
    await nextTick();
    const element = viewport;
    if (element !== null) element.scrollTop = element.scrollHeight;
  }
);

/** El globo en vuelo como mensaje: mismo contrato, fuera de la lista. */
const streamingMessage = computed<ChatMessageModel>(() => ({
  id: 'streaming',
  role: 'assistant',
  parts: [{ type: 'text', text: streamingText.value }],
  createdAt: '',
  status: 'streaming',
}));
</script>

<template>
  <ScrollArea ref="area" class="h-full min-h-0">
    <div class="mx-auto flex w-full max-w-composer flex-col gap-5 px-8 py-8">
      <StudioMessage v-for="message in messages" :key="message.id" :message="message" />
      <StudioMessage v-if="streamingText !== ''" :message="streamingMessage" />
    </div>
  </ScrollArea>
</template>
