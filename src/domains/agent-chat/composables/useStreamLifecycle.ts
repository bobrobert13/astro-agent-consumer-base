import { markRaw, onScopeDispose, ref, shallowRef } from 'vue';

import { resultError, resultOk, type Result } from '@shared/result/result.pattern';
import { STREAM_STALL_MS } from '@config/app';
import { CHAT_ERROR_CODES } from './services/chat/chat.e';
import type { StreamState } from '../types/chat.types';

/**
 * @file src/domains/agent-chat/composables/useStreamLifecycle.ts
 * @description Máquina de estados de una ejecución, con cancelación y vigilante
 * de silencio.
 *
 * Dos cosas que este módulo garantiza y que son fáciles de romper desde la UI:
 *
 * 1. **Un solo dueño del `AbortController`.** Se guarda con `markRaw`: un
 *    controller envuelto en un `ref` normal pasa por el proxy de reactividad de
 *    Vue, y eso rompe los métodos internos del objeto nativo.
 * 2. **El abort ocurre al desmontar.** `onScopeDispose` cubre isla desmontada,
 *    navegación con `transition:persist` y efecto destruido por el host. Sin
 *    esto, cada navegación dejaría un stream vivo en el servidor.
 *
 * El vigilante de silencio mide *tiempo entre chunks*, no duración total: una
 * respuesta larga y sana no es un cuelgue.
 */
export function useStreamLifecycle() {
  const state = ref<StreamState>('idle');
  const errorMessage = ref<string | undefined>(undefined);

  const controller = shallowRef<AbortController | null>(null);
  let stallTimer: ReturnType<typeof setTimeout> | undefined;

  function clearStallTimer(): void {
    if (stallTimer !== undefined) clearTimeout(stallTimer);
    stallTimer = undefined;
  }

  function armStallWatchdog(): void {
    clearStallTimer();
    stallTimer = setTimeout(() => {
      if (state.value === 'streaming') state.value = 'stalled';
    }, STREAM_STALL_MS);
    // En Node (tests SSR-adjacentes) no debe mantener el proceso vivo.
    stallTimer.unref?.();
  }

  /** Inicia una ejecución. `run` recibe el signal y debe respetarlo. */
  async function start(run: (signal: AbortSignal) => Promise<Result<void>>): Promise<Result<void>> {
    stop();
    errorMessage.value = undefined;
    state.value = 'connecting';
    armStallWatchdog();

    const abort = markRaw(new AbortController());
    controller.value = abort;

    const result = await run(abort.signal);

    clearStallTimer();
    controller.value = null;

    if (abort.signal.aborted) {
      state.value = 'idle';
      return resultOk<void>(undefined);
    }
    if (!result.ok) {
      state.value = 'error';
      errorMessage.value = result.error.message;
      return result;
    }

    state.value = 'idle';
    return result;
  }

  /** Marca que llegó tráfico: el reloj de silencio vuelve a cero. */
  function markActivity(): void {
    if (state.value === 'connecting') state.value = 'streaming';
    if (state.value === 'stalled') state.value = 'streaming';
    armStallWatchdog();
  }

  /** Cancela la ejecución en curso. Idempotente. */
  function stop(): void {
    clearStallTimer();
    controller.value?.abort();
    controller.value = null;
    if (state.value !== 'idle' && state.value !== 'error') state.value = 'idle';
  }

  /** Se quedó sin respuesta: se cancela el upstream y se reporta el código. */
  function reportStall(): Result<void> {
    stop();
    state.value = 'error';
    return resultError<void>({
      statusCode: 504,
      code: CHAT_ERROR_CODES.streamStalled,
      message: 'El agente dejó de responder.',
    });
  }

  const isRunning = (): boolean => state.value === 'connecting' || state.value === 'streaming' || state.value === 'stalled';

  onScopeDispose(() => {
    clearStallTimer();
    controller.value?.abort();
  });

  return { state, errorMessage, isRunning, start, stop, markActivity, reportStall };
}
