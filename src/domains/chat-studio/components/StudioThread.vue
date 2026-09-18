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
 * **El turno en curso vive aquí dentro** (`StudioRunStatus`): el hueco de la
 * respuesta es contenido del transcript, no una banda de estado del panel. Así la
 * ejecución no empuja el hilo ni ocupa el ancho completo, y el aviso aparece
 * justo donde va a llegar la respuesta.
 *
 * **`ScrollArea` y no `overflow-y-auto`**: reka-ui pone el `overflow` en su propio
 * viewport, no en el elemento raíz, así que el listener de scroll va sobre ese
 * nodo —el evento `scroll` no burbujea y no llegaría a la raíz— y `scrollTop` se
 * escribe en el viewport, no en el root, que solo recorta.
 */
import { nextTick, onMounted, onScopeDispose, computed, ref, watch } from 'vue';

import { ScrollArea } from '@components/ui/scroll-area';
import { useAgentChat, type ChatMessage as ChatMessageModel, type StreamState } from '@domains/agent-chat';
import StudioMessage from './StudioMessage.vue';
import StudioRunStatus from './StudioRunStatus.vue';

interface Props {
  /** Estado de la ejecución en curso; lo posee el panel. */
  state: StreamState;
  /** Primer envío del hilo: solo ahí se anuncia la conexión. */
  firstRun: boolean;
}

const props = defineProps<Props>();
defineEmits<{ retry: [] }>();

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
    <!--
      `min-w-0` en la columna: sin él, un bloque de código o una URL larga del
      agente ensanchan el contenedor flex y el transcript desborda el panel en
      lugar de recortar dentro de su globo.
    -->
    <div class="mx-auto flex w-full min-w-0 max-w-composer flex-col gap-5 px-4 py-6 nav:px-8 nav:py-8">
      <StudioMessage v-for="message in messages" :key="message.id" :message="message" />

      <!--
        El globo en vuelo existe en cuanto hay texto; mientras no lo haya, el hueco
        lo ocupa el turno en curso (`pending`). Se pintan juntos solo en el caso
        raro de una respuesta a medias que se quedó sin llegar al final: ahí el
        aviso de `stalled` va **debajo** del texto, que es donde se busca.
      -->
      <StudioMessage v-if="streamingText !== ''" :message="streamingMessage" />
      <StudioRunStatus
        :state="props.state"
        :first-run="props.firstRun"
        :pending="streamingText === ''"
        @retry="$emit('retry')"
      />
    </div>
  </ScrollArea>
</template>
