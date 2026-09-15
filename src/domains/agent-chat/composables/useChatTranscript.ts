import { ref, shallowRef } from 'vue';

import { createTokenBatcher } from '@shared/streams/token-batcher';
import type { ChatMessage, MessageStatus } from '../types/chat.types';

/**
 * @file src/domains/agent-chat/composables/useChatTranscript.ts
 * @description Dueño del historial visible y de la política de re-render.
 *
 * Las dos decisiones que hacen que un chat con streaming vaya fluido:
 *
 * 1. `shallowRef` para la lista. Con `ref([...])` Vue volvería a proxyear **cada
 *    mensaje** en cada inserción: O(n) por chunk, que a 100 tokens/s es el
 *    coste dominante de la página. La mutación es siempre por reemplazo
 *    inmutable de la lista.
 * 2. El texto que está llegando **no** es un mensaje de la lista: vive en
 *    `streamingText` y lo drena un `token-batcher` (una escritura por frame,
 *    aunque lleguen cuarenta deltas). Al cerrar, se promociona a mensaje y ahí,
 *    y solo ahí, entra en el `v-for`.
 */
export function useChatTranscript() {
  const messages = shallowRef<ChatMessage[]>([]);
  const streamingText = ref('');
  const activeAssistantId = ref<string | undefined>(undefined);

  let batcher = createTokenBatcher({ onFlush: (text) => streamingText.value += text });

  const now = (): string => new Date().toISOString();
  const nextId = (): string => `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

  function append(message: ChatMessage): void {
    messages.value = [...messages.value, message];
  }

  function appendUser(prompt: string): ChatMessage {
    const message: ChatMessage = {
      id: nextId(),
      role: 'user',
      parts: [{ type: 'text', text: prompt }],
      createdAt: now(),
      status: 'done',
    };
    append(message);
    return message;
  }

  /** Abre el globo del asistente: todavía vacío, pero en pantalla. */
  function startAssistant(): void {
    streamingText.value = '';
    batcher.destroy();
    batcher = createTokenBatcher({ onFlush: (text) => (streamingText.value += text) });
    activeAssistantId.value = nextId();
  }

  /** Encola un delta. No toca la lista: el batching decide cuándo se pinta. */
  function pushDelta(text: string): void {
    batcher.push(text);
  }

  /** Cierra el globo, con el texto completo (incluye lo en-flight). */
  function finishAssistant(status: MessageStatus, error?: string | undefined): ChatMessage | undefined {
    batcher.flush();
    const text = streamingText.value;
    streamingText.value = '';

    const id = activeAssistantId.value;
    activeAssistantId.value = undefined;
    if (id === undefined) return undefined;

    const message: ChatMessage = {
      id,
      role: 'assistant',
      parts: text === '' ? [] : [{ type: 'text', text }],
      createdAt: now(),
      status,
      ...(error !== undefined ? { error } : {}),
    };
    append(message);
    return message;
  }

  /** Añade una tarjeta de herramienta sin romper el orden del transcript. */
  function appendToolCall(toolName: string, args: unknown, result?: unknown): void {
    append({
      id: nextId(),
      role: 'assistant',
      parts: [{ type: 'tool-call', toolName, args, ...(result !== undefined ? { result } : {}) }],
      createdAt: now(),
      status: 'done',
    });
  }

  /** Descarta el globo en curso (lo usa `stop()` cuando no había texto). */
  function discardStreaming(): void {
    batcher.destroy();
    streamingText.value = '';
    activeAssistantId.value = undefined;
  }

  function reset(): void {
    messages.value = [];
    discardStreaming();
  }

  return {
    messages,
    streamingText,
    activeAssistantId,
    appendUser,
    startAssistant,
    pushDelta,
    finishAssistant,
    appendToolCall,
    discardStreaming,
    reset,
  };
}
