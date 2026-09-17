<script setup lang="ts">
/**
 * @file src/domains/agent-chat/components/ChatIsland.vue
 * @description Raíz de la isla de chat. Es lo único que monta un `.astro`.
 *
 * Se hidrata con `client:only="vue"` desde la página: el SSR de un transcript
 * vacío no aporta nada y evaluaría el cliente del proveedor en el servidor. Y
 * viaja con `transition:persist`, que es lo que permite navegar a otro hilo sin
 * cortar el stream en curso.
 *
 * **Por qué se desestructura aquí**: `useAgentChat()` devuelve un objeto plano con
 * refs dentro, y Vue solo desenvuelve los refs de nivel superior del `setup()`.
 * Escribir `chat.messages` en la plantilla entrega el `Ref`, y `v-for` sobre él
 * itera sus claves internas: el resultado visible es un puñado de burbujas vacías
 * y un `[object Object]` en el composer. Desestructurar lo arregla.
 *
 * No usar `reactive()` sobre el objeto devuelto como atajo: volvería a proxyear la
 * lista de mensajes y se pierde justo lo que `shallowRef` protege.
 *
 * La acción "limpiar conversación" vive en el composer (ver `ChatComposer`), no
 * en un botón escondido con `sr-only`: borrar un hilo sin preguntar y sin nada
 * visible que lo anuncie es lo que hacía antes, y no había forma de descubrirlo.
 */
import { onMounted, onScopeDispose, watch } from 'vue';

import ChatComposer from './ChatComposer.vue';
import ChatTranscript from './ChatTranscript.vue';
import MemoryNotice from './MemoryNotice.vue';
import StreamStatusBar from './StreamStatusBar.vue';
import { DEFAULT_AGENT_ID, NEW_THREAD_ID } from '@config/app';
import { useAgentChat } from '../composables/useAgentChat';

const props = withDefaults(
  defineProps<{
    agentId?: string;
    threadId?: string;
  }>(),
  { agentId: DEFAULT_AGENT_ID, threadId: NEW_THREAD_ID }
);

const {
  canSubmit,
  clearConversation,
  isRunning,
  memoryPressure,
  messages,
  send,
  setAgent,
  setThread,
  state,
  stop,
  streamingText,
  submit,
  text,
  transportLabel,
} = useAgentChat();

onMounted(() => {
  setAgent(props.agentId);
  setThread(props.threadId);
});

// Cambiar de hilo o de agente llega por props sin desmontar la isla (persist).
watch(
  () => [props.agentId, props.threadId],
  ([agentId, threadId]) => {
    setAgent(agentId);
    setThread(threadId);
  }
);

function onInput(value: string): void {
  text.value = value;
}

function onSubmit(): void {
  void submit();
}

/** Relanza el último prompt del usuario tras un `stalled`. */
function onRetry(): void {
  const last = [...messages.value].reverse().find((message) => message.role === 'user');
  const prompt = last?.parts.find((part) => part.type === 'text')?.text;
  if (typeof prompt === 'string') void send(prompt);
}

/**
 * `Escape` detiene la respuesta en curso (`SHORTCUTS.stopStream` en /settings).
 * Es local a la isla, no global: sin ejecución no hay nada que detener, y así
 * ningún otro contexto pierde la tecla. Solo actúa con stream vivo, por lo que
 * Escape dentro del textarea sin ejecución sigue sin hacer nada.
 */
function onKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Escape' || !isRunning()) return;
  event.preventDefault();
  stop();
}

onMounted(() => document.addEventListener('keydown', onKeydown));
onScopeDispose(() => document.removeEventListener('keydown', onKeydown));
</script>

<template>
  <section class="flex h-full min-h-0 flex-col" aria-label="Conversación con el agente">
    <ChatTranscript :messages="messages" :streaming-text="streamingText">
      <template #empty>
        <div class="mx-auto max-w-prose py-section text-center">
          <p class="text-label">Cuéntale al agente qué necesitas</p>
          <p class="mt-1 text-caption text-ink-muted">
            Transporte <code>{{ transportLabel }}</code>. Prueba
            <code>/error</code> para ver el catálogo de errores o
            <code>/slow</code> para provocar el estado sin respuesta.
          </p>
        </div>
      </template>
    </ChatTranscript>

    <MemoryNotice :pressure="memoryPressure" />

    <StreamStatusBar :state="state" @stop="stop()" @retry="onRetry" />

    <ChatComposer
      :text="text"
      :can-submit="canSubmit"
      :disabled="isRunning()"
      @update:text="onInput"
      @submit="onSubmit"
      @stop="stop"
      @clear="clearConversation()"
    />
  </section>
</template>
