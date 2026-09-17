import { useChat } from '@ai-sdk/vue';
import { createSharedComposable } from '@vueuse/shared';
import { computed, ref, watch } from 'vue';

import { NEW_THREAD_ID } from '@config/app';
import { AGENT_TRANSPORT } from '@shared/env/client';
import { reportError } from '@shared/observability/report-error';
import { normalizeServiceError, resultError, resultOk, type Result } from '@shared/result/result.pattern';
import { adaptTranscript, resolveStreamErrorText, toStreamState, uiTextLength } from '../ai/adapt-ui-messages';
import { resolveChatTransport } from '../ai/chat.transport';
import type { StreamState } from '../types/chat.types';
import { useChatComposer } from './useChatComposer';
import { useStallWatchdog } from './useStallWatchdog';
import { CHAT_ERROR_CODES } from './services/chat/chat.e';

/**
 * @file src/domains/agent-chat/composables/useAgentChat.ts
 * @description Orquestador del slice, ahora sobre `useChat` del AI SDK.
 *
 * Lo que este archivo **ya no hace**, porque lo hace el SDK: hablar el protocolo
 * del stream, mantener el historial, abortar, reconectar y exponer el estado de la
 * ejecución. Lo que sí hace, y es lo que le da valor:
 *
 *  - **Traduce el vocabulario.** `useChat` entrega `UIMessage`; la isla consume
 *    `ChatMessage`. El puente es `adapt-ui-messages`, y es la razón de que ningún
 *    componente tenga que saber qué es un `text-delta`.
 *  - **Añade lo que el SDK no trae**: el vigilante de silencio (`useStallWatchdog`)
 *    y el reloj de actividad, porque `status` no distingue "pensando" de "muerto".
 *  - **Conserva las reglas de la casa**: nunca lanza (todo sale como `Result`),
 *    ningún texto de error del proveedor llega a la pantalla, y el globo en vuelo
 *    vive fuera de la lista de mensajes.
 *
 * `createSharedComposable`: en Astro cada isla es su propia `createApp()`, así que
 * el estado compartido entre islas hermanas se resuelve con singleton de módulo.
 */
function defineAgentChat() {
  const activeAgentId = ref('research-agent');
  const threadId = ref(NEW_THREAD_ID);
  /** Error ya traducido por el catálogo; `undefined` mientras no haya fallo. */
  const errorText = ref<string | undefined>(undefined);
  /** El usuario detuvo la ejecución: el globo abierto se marca como cancelado. */
  const aborted = ref(false);

  // Un solo transporte para toda la sesión: el agente y el hilo se leen en cada
  // envío desde estos refs (ver `ai/chat.transport.ts`), no se fijan al construir.
  const chat = useChat({
    transport: resolveChatTransport(() => ({ agentId: activeAgentId.value, thread: threadId.value })),
  });

  const inFlight = computed(() => chat.status.value === 'submitted' || chat.status.value === 'streaming');

  const stall = useStallWatchdog({
    running: () => inFlight.value,
    activity: () => uiTextLength(chat.messages.value),
  });

  const composer = useChatComposer({ disabled: () => inFlight.value });
  const transportLabel = computed(() => AGENT_TRANSPORT);
  const state = computed<StreamState>(() => toStreamState(chat.status.value, stall.stalled.value));

  /**
   * El fallo se normaliza y se reporta **una vez por error**, no en cada
   * recálculo del transcript: `reportError` es un efecto y un `computed` no es su
   * sitio. El texto crudo del proveedor solo se registra; a la pantalla va el
   * catálogo (`chat.e.ts`).
   */
  watch(chat.error, (error) => {
    if (error === undefined) return;

    const reported = normalizeServiceError(error, 502);
    // Cancelar no es fallar: `stop()` ya marcó el globo como cancelado.
    if (reported.code === CHAT_ERROR_CODES.aborted) return;

    reportError(reported, { scope: 'agent-chat/stream' });
    errorText.value = resolveStreamErrorText(error);

    /**
     * Se limpia el error del SDK en cuanto su texto ya vive en el globo del
     * transcript, y por dos motivos:
     *
     *  1. `status` se queda en `error` hasta que alguien lo limpia, así que la
     *     franja de estado no desaparecería nunca y la ejecución parecería
     *     seguir abierta.
     *  2. El error ya está a la vista en el mensaje; dejarlo también en el estado
     *     del chat lo haría salir por dos sitios distintos.
     *
     * `errorText` NO se limpia aquí (el `undefined` que dispara este efecto al
     * vaciarse sale por el `return` de arriba): lo limpia el siguiente envío.
     */
    chat.clearError();
  });

  const transcript = computed(() =>
    adaptTranscript(chat.messages.value, {
      inFlight: inFlight.value,
      ...(errorText.value !== undefined ? { errorText: errorText.value } : {}),
      aborted: aborted.value,
    })
  );

  const messages = computed(() => transcript.value.messages);
  const streamingText = computed(() => transcript.value.streamingText);

  function setAgent(agentId: string): void {
    if (inFlight.value) return;
    activeAgentId.value = agentId;
  }

  /** La página lo llama con el `params.threadId`; también reinicia el historial. */
  function setThread(thread: string): void {
    if (threadId.value === thread) return;
    clearConversation();
    threadId.value = thread;
  }

  function clearConversation(): void {
    chat.stop();
    chat.messages.value = [];
    errorText.value = undefined;
    aborted.value = false;
  }

  async function send(prompt: string): Promise<Result<void>> {
    const clean = prompt.trim();
    if (clean === '') {
      return resultError<void>({
        statusCode: 400,
        code: CHAT_ERROR_CODES.invalidRequest,
        message: 'Escribe algo primero.',
      });
    }

    composer.clear();
    errorText.value = undefined;
    aborted.value = false;

    try {
      await chat.sendMessage({ text: clean });
    } catch (error) {
      return resultError<void>(normalizeServiceError(error, 502));
    }

    // El SDK no rechaza: deja el fallo en `chat.error`, así que el contrato
    // "nunca lanza" se cumple traduciéndolo aquí.
    const failure = chat.error.value;
    return failure === undefined
      ? resultOk<void>(undefined)
      : resultError<void>(normalizeServiceError(failure, 502));
  }

  function submit(): Promise<Result<void>> {
    return send(composer.trimmed.value);
  }

  function stop(): void {
    if (!inFlight.value) return;
    aborted.value = true;
    chat.stop();
  }

  const isRunning = (): boolean => inFlight.value;

  return {
    activeAgentId,
    threadId,
    transportLabel,
    state,
    isRunning,
    messages,
    streamingText,
    text: composer.text,
    canSubmit: composer.canSubmit,
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
