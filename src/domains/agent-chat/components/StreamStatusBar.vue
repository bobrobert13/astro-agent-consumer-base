<script setup lang="ts">
/**
 * @file src/domains/agent-chat/components/StreamStatusBar.vue
 * @description Franja de estado de la ejecución: conectando, generando, sin
 * respuesta, o con la acción de detener.
 *
 * Existe para que el estado de `useStreamLifecycle` sea visible: un chat que se
 * queda callado a media ejecución sin decir nada se lee como una app rota.
 */
import { computed } from 'vue';

import type { StreamState } from '../types/chat.types';

const props = defineProps<{ state: StreamState }>();
defineEmits<{ stop: []; retry: [] }>();

const LABELS: Record<StreamState, string> = {
  idle: '',
  connecting: 'Conectando con el agente…',
  streaming: 'Generando respuesta…',
  stalled: 'Sin respuesta del agente.',
  error: 'La respuesta terminó con error.',
};

const label = computed(() => LABELS[props.state]);
const visible = computed(() => props.state !== 'idle');
const canStop = computed(() => props.state === 'connecting' || props.state === 'streaming');
</script>

<template>
  <div
    v-if="visible"
    role="status"
    aria-live="polite"
    class="flex items-center gap-2 border-t border-line bg-elevated px-4 py-1.5 text-xs"
    :class="state === 'error' ? 'text-danger' : state === 'stalled' ? 'text-warning' : 'text-ink-muted'"
  >
    <span v-if="state === 'connecting' || state === 'streaming'" class="size-2 animate-pulse rounded-full bg-brand-500" aria-hidden="true" />
    <span>{{ label }}</span>
    <button v-if="canStop" type="button" class="ml-auto underline hover:no-underline" @click="$emit('stop')">
      Detener
    </button>
    <button v-else-if="state === 'stalled'" type="button" class="ml-auto underline hover:no-underline" @click="$emit('retry')">
      Reintentar
    </button>
  </div>
</template>
