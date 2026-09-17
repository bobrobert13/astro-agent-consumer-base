import { onScopeDispose, ref, watch, type Ref } from 'vue';

import { STREAM_STALL_MS } from '@config/app';

/**
 * @file src/domains/agent-chat/composables/useStallWatchdog.ts
 * @description Vigilante de silencio de una ejecución.
 *
 * El AI SDK no trae watchdog: su `status` se queda en `streaming` tanto si el
 * agente está pensando como si el upstream se ha muerto a media respuesta. Sin
 * esto, un backend caído dejaría "Generando respuesta…" para siempre y el usuario
 * no sabría que puede reintentar.
 *
 * Mide **tiempo entre chunks**, no duración total: una respuesta larga y sana no
 * es un cuelgue. La señal de actividad es la longitud del texto recibido, que es
 * lo único que cambia de un chunk al siguiente.
 */
export function useStallWatchdog(options: {
  /** ¿Hay ejecución en curso? Fuera de una no se vigila nada. */
  running: () => boolean;
  /** Señal que cambia con cada chunk. */
  activity: () => number;
}): { stalled: Ref<boolean> } {
  const stalled = ref(false);
  let timer: ReturnType<typeof setTimeout> | undefined;

  function clear(): void {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  }

  function arm(): void {
    clear();
    timer = setTimeout(() => {
      // También desde `connecting`: un upstream que ni siquiera responde con
      // cabeceras dejaría la UI en "Conectando…" para siempre si solo se
      // vigilara el estado `streaming`.
      if (options.running()) stalled.value = true;
    }, STREAM_STALL_MS);
    // En Node (tests SSR-adjacentes) no debe mantener el proceso vivo.
    timer.unref?.();
  }

  watch(
    () => [options.running(), options.activity()] as const,
    ([running]) => {
      // Cada chunk rearma el reloj y limpia la marca: el silencio se mide desde
      // el último dato, no desde el principio de la ejecución.
      stalled.value = false;
      if (running) arm();
      else clear();
    },
    { immediate: true }
  );

  onScopeDispose(clear);

  return { stalled };
}
