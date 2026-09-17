<script setup lang="ts">
/**
 * @file src/domains/agent-chat/components/MemoryNotice.vue
 * @description Aviso de memoria del hilo: el backend está a punto de resumir.
 *
 * Existe porque el backend **sí** reporta esa presión y descartarla en silencio
 * dejaba al usuario sin explicación para algo que nota: cuando la ventana de memoria
 * se llena, Mastra resume el historial y el agente pasa a "recordar" menos. Avisar
 * antes es la diferencia entre una decisión del sistema y una pérdida inexplicable.
 *
 * El umbral vive aquí y no en el composable, a propósito: medir la presión es
 * aritmética del adapter, decidir cuándo merece molestar al usuario es política de la
 * vista. Por debajo del umbral no se pinta **nada** — ni un hueco.
 *
 * Se pinta con el `Alert` del registry y la misma forma de banda que
 * `StreamStatusBar`, para que la conversación no tenga dos lenguajes de aviso.
 */
import { computed } from 'vue';

import { Alert } from '@/components/ui/alert';

const props = defineProps<{ pressure: number }>();

/** A partir de aquí el resumen es inminente; antes, avisar sería ruido. */
const NOTICE_FROM = 0.8;

const visible = computed(() => props.pressure >= NOTICE_FROM);
const percent = computed(() => Math.round(props.pressure * 100));
</script>

<template>
  <Alert
    v-if="visible"
    role="status"
    aria-live="polite"
    class="flex items-center gap-2 rounded-none border-x-0 border-t-0 bg-elevated px-gutter py-1.5 text-caption text-ink-muted"
  >
    <span>La memoria de este hilo va llena ({{ percent }} %). Mastra resumirá el historial en breve.</span>
  </Alert>
</template>
