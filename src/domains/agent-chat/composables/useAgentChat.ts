import { createSharedComposable } from '@vueuse/shared';
import { computed, ref } from 'vue';

import { resultError, type Result } from '@shared/result/result.pattern';
import { reportError } from '@shared/observability/report-error';
import { AGENT_TRANSPORT } from '@shared/env/client';
import { NEW_THREAD_ID } from '@config/app';
import { transport } from '../transport';
import type { StreamChunk } from '../transport/types';
import type { RunConfig } from '../types/chat.types';
import { useChatComposer } from './useChatComposer';
import { useChatTranscript } from './useChatTranscript';
import { useStreamLifecycle } from './useStreamLifecycle';
import { CHAT_ERROR_CODES, resolveChatErrorMessage } from './services/chat/chat.e';

/**
 * @file src/domains/agent-chat/composables/useAgentChat.ts
 * @description Orquestador del slice: une transporte, transcript y ciclo de vida.
 *
 * Es **el** patrón que copian las slices siguientes, así que las decisiones que
 * se ven aquí son deliberadas:
 *
 *  - `createSharedComposable`: en Astro cada isla es su propia `createApp()`, así
 *    que el estado compartido entre islas hermanas se resuelve con singleton de
 *    módulo, no con un store nuevo.
 *  - Habla con `AgentTransport`, jamás con el proveedor.
 *  - Ninguna promesa lanza: todo error sale como `Result` y se traduce con el
 *    catálogo de `chat.e.ts`.
 *  - Un solo punto de cierre del globo del asistente (`finishAssistant` es
 *    idempotente porque limpia `activeAssistantId`), para que un chunk de error
 *    y el final del `start()` no creen dos mensajes.
 */
function defineAgentChat() {
  const transcript = useChatTranscript();
  const lifecycle = useStreamLifecycle();
  const composer = useChatComposer({ disabled: lifecycle.isRunning });

  const activeAgentId = ref('research-agent');
  const threadId = ref(NEW_THREAD_ID);
  /** Qué transporte está activo, para que la UI lo diga en vez de fingir. */
  const transportLabel = computed(() => AGENT_TRANSPORT);

  function setAgent(agentId: string): void {
    if (lifecycle.isRunning()) return;
    activeAgentId.value = agentId;
  }

  /** La página lo llama con el `params.threadId`; también reinicia el historial. */
  function setThread(thread: string): void {
    if (threadId.value === thread) return;
    clearConversation();
    threadId.value = thread;
  }

  /** Convierte un chunk del transporte en mutaciones del transcript. */
  function onChunk(chunk: StreamChunk): void {
    lifecycle.markActivity();

    switch (chunk.type) {
      case 'text-delta':
        transcript.pushDelta(chunk.text);
        break;
      case 'tool-call':
        transcript.appendToolCall(chunk.toolName, chunk.args);
        break;
      case 'error':
        // El `message` del proveedor es texto interno del servidor (workflows,
        // processors, nombres de clases). Se registra para diagnóstico y a la
        // pantalla va el catálogo: el usuario ve qué hacer, no la tripulación.
        reportError({ statusCode: 502, code: chunk.code ?? CHAT_ERROR_CODES.agentError, message: chunk.message }, { scope: 'agent-chat/stream' });
        transcript.finishAssistant(
          'error',
          resolveChatErrorMessage({ statusCode: 502, code: chunk.code ?? CHAT_ERROR_CODES.agentError })
        );
        break;
      // `text-end`, `tool-result` y `finish` no mutan el transcript en la v1:
      // el cierre real lo hace el final de `start()`.
      default:
        break;
    }
  }

  async function send(prompt: string, config?: RunConfig): Promise<Result<void>> {
    const clean = prompt.trim();
    if (clean === '') {
      return resultError<void>({
        statusCode: 400,
        code: CHAT_ERROR_CODES.invalidRequest,
        message: 'Escribe algo primero.',
      });
    }

    transcript.appendUser(clean);
    transcript.startAssistant();
    composer.clear();

    const result = await lifecycle.start((signal) =>
      transport.stream(
        { agentId: activeAgentId.value, prompt: clean, thread: threadId.value, config },
        { signal, onChunk }
      )
    );

    // Cierra el globo si todavía está abierto (un chunk de error ya lo cerró).
    if (transcript.activeAssistantId.value !== undefined) {
      transcript.finishAssistant(
        result.ok ? 'done' : 'error',
        result.ok ? undefined : resolveChatErrorMessage(result.error)
      );
    }

    return result;
  }

  function submit(): Promise<Result<void>> {
    return send(composer.trimmed.value);
  }

  function stop(): void {
    lifecycle.stop();
    if (transcript.activeAssistantId.value !== undefined) {
      transcript.finishAssistant(
        'aborted',
        resolveChatErrorMessage({ statusCode: 499, code: CHAT_ERROR_CODES.aborted })
      );
    }
  }

  function clearConversation(): void {
    lifecycle.stop();
    transcript.reset();
  }

  return {
    ...transcript,
    ...lifecycle,
    ...composer,
    activeAgentId,
    threadId,
    transportLabel,
    setAgent,
    setThread,
    send,
    submit,
    stop,
    clearConversation,
  };
}

/**
 * Singleton compartido entre islas. `useAgentChat()` desde cualquier componente
 * del mismo documento ve el mismo estado.
 */
export const useAgentChat = createSharedComposable(defineAgentChat);
