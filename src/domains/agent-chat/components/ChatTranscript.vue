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
 *
 * **ScrollArea y no `overflow-y-auto`**: reka-ui pone el `overflow` en su propio
 * viewport, no en el elemento raíz, así que el listener de scroll es nativo sobre
 * ese nodo — el evento `scroll` no burbujea y no llegaría a la raíz. Lo mismo
 * para el autoscroll: `scrollTop` se escribe en el viewport, no en el root (que
 * solo recorta).
 */
import { Check, Copy, Ellipsis } from '@lucide/vue';
import { nextTick, onMounted, onScopeDispose, ref, watch } from 'vue';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { reportError } from '@shared/observability/report-error';
import ChatMessage from './ChatMessage.vue';
import { messageTextLength } from './chat.memo';
import type { ChatMessage as ChatMessageModel } from '../types/chat.types';

const props = defineProps<{
  messages: ChatMessageModel[];
  streamingText: string;
}>();

defineSlots<{
  empty?: () => unknown;
}>();

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
  clearTimeout(copiedTimer);
});

watch(
  () => [props.messages.length, props.streamingText.length],
  async () => {
    if (!pinned.value) return;
    await nextTick();
    const element = viewport;
    if (element !== null) element.scrollTop = element.scrollHeight;
  }
);

const copiedId = ref<string | null>(null);
let copiedTimer: ReturnType<typeof setTimeout> | undefined;

/**
 * Copiar es una acción de chrome, no de dominio: si el portapapeles la deniega
 * (permiso, contexto no seguro) se reporta y el botón simplemente no cambia de
 * estado. No hay código en `chat.e.ts` porque no hay nada que el usuario pueda
 * hacer al respecto.
 */
async function copyMessage(message: ChatMessageModel): Promise<void> {
  const text = message.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('\n\n');

  try {
    await navigator.clipboard.writeText(text);
    copiedId.value = message.id;
    clearTimeout(copiedTimer);
    copiedTimer = setTimeout(() => {
      copiedId.value = null;
    }, 1500);
  } catch (error) {
    reportError(error, { scope: 'agent-chat/clipboard' });
  }
}
</script>

<template>
  <ScrollArea ref="area" class="h-full min-h-0">
    <div class="mx-auto flex max-w-column flex-col gap-flow px-gutter py-block">
      <slot v-if="messages.length === 0 && streamingText === ''" name="empty" />

      <ChatMessage v-for="message in messages" :key="message.id" :message="message">
        <template v-if="messageTextLength(message) > 0" #actions>
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <Button
                variant="ghost"
                size="icon-xs"
                :aria-label="copiedId === message.id ? 'Respuesta copiada' : 'Acciones del mensaje'"
              >
                <Check v-if="copiedId === message.id" />
                <Ellipsis v-else />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem @select="copyMessage(message)">
                <Copy />
                Copiar respuesta
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </template>
      </ChatMessage>

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
  </ScrollArea>
</template>
