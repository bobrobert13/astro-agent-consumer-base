<script setup lang="ts">
/**
 * @file src/domains/chat-studio/components/StudioRunStatus.vue
 * @description Turno en curso: el hueco donde va a aparecer la respuesta.
 *
 * **Dos correcciones de la franja anterior**, que ocupaba el ancho completo entre
 * el hilo y el composer:
 *
 *  1. **Dónde se pinta.** El aviso vivía en una banda a todo lo ancho que empujaba
 *     el hilo cada vez que arrancaba una ejecución. Aquí es un turno más del
 *     transcript: se dibuja en la columna de mensajes, con el avatar del
 *     asistente, y por tanto no mueve nada ni compite con el contenido.
 *  2. **Qué dice.** "Conectando con el agente…" se anunciaba en **cada** envío,
 *     porque el SDK pasa por `submitted` en todos. La conexión ya está hecha desde
 *     la primera respuesta del hilo, así que la etiqueta sale solo en el primer
 *     envío (`firstRun`); a partir de ahí quedan los puntos de escritura, que es
 *     la información útil. El `sr-only` mantiene el anuncio para lectores de
 *     pantalla sin repetir el texto en pantalla.
 *
 * El estado `stalled` sí se pinta como aviso con acción: ahí no hay respuesta
 * llegando y el usuario tiene que poder reintentar sin salir del hilo.
 *
 * **`aria-label="Estado de la ejecución"` es contrato con los tests**, igual que
 * lo era en la franja: es la región de estado de la ejecución, distinta del aviso
 * de memoria (que también es `role="status"` pero persiste).
 */
import { computed } from 'vue';

import type { StreamState } from '@domains/agent-chat';
import StudioImageSlot from './StudioImageSlot.vue';
import { STUDIO_COPY, STUDIO_IMAGE_SLOTS } from '../data/studio.seed';

const props = defineProps<{
  state: StreamState;
  /** Primer envío del hilo: la conexión con el agente aún no se ha establecido. */
  firstRun: boolean;
  /** Sin texto en vuelo todavía; si ya lo hay, el globo del stream ocupa este hueco. */
  pending: boolean;
}>();

defineEmits<{ retry: [] }>();

const working = computed(() => props.state === 'connecting' || props.state === 'streaming');
const stalled = computed(() => props.state === 'stalled');
const visible = computed(() => stalled.value || (working.value && props.pending));

/** Solo el primer envío del hilo anuncia la conexión (ver cabecera). */
const caption = computed(() =>
  props.state === 'connecting' && props.firstRun ? STUDIO_COPY.connecting : ''
);
</script>

<template>
  <div
    v-if="visible"
    role="status"
    aria-live="polite"
    aria-label="Estado de la ejecución"
    class="flex flex-col gap-1 self-start"
  >
    <div v-if="working" class="flex items-start gap-3">
      <StudioImageSlot
        :name="STUDIO_IMAGE_SLOTS.assistant"
        class="mt-0.5 size-7 rounded-md bg-elevated"
      />

      <div class="flex min-w-0 flex-col gap-1">
        <span class="inline-flex w-fit gap-1 rounded-bubble rounded-tl-sm bg-elevated px-3.5 py-3">
          <i v-for="dot in 3" :key="dot" class="size-1.5 animate-blink rounded-full bg-ink-muted" aria-hidden="true" />
        </span>

        <span v-if="caption !== ''" class="text-caption text-ink-muted">{{ caption }}</span>
        <span v-else class="sr-only">{{ STUDIO_COPY.generating }}</span>
      </div>
    </div>

    <div
      v-else
      class="flex max-w-measure flex-wrap items-center gap-x-3 gap-y-1.5 rounded-panel border border-warning/40 bg-warning/10 px-3 py-2"
    >
      <span class="text-caption text-ink">{{ STUDIO_COPY.stalled }}</span>
      <button
        type="button"
        class="ml-auto shrink-0 rounded-control px-2 py-1 text-caption font-semibold text-brand-600 transition-colors hover:bg-brand-050"
        @click="$emit('retry')"
      >
        {{ STUDIO_COPY.retry }}
      </button>
    </div>
  </div>
</template>
