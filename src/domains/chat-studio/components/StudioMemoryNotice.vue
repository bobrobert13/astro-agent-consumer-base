<script setup lang="ts">
/**
 * @file src/domains/chat-studio/components/StudioMemoryNotice.vue
 * @description Aviso de memoria del hilo: el backend está a punto de resumir.
 *
 * Existe porque el backend **sí** reporta esa presión y descartarla en silencio
 * dejaba a la persona sin explicación para algo que nota: cuando la ventana de
 * memoria se llena, Mastra resume el historial y el agente pasa a "recordar"
 * menos. Avisar antes es la diferencia entre una decisión del sistema y una
 * pérdida inexplicable.
 *
 * El umbral vive aquí y no en el composable, a propósito: medir la presión es
 * aritmética del adapter, decidir cuándo merece molestar es política de la vista.
 * Por debajo del umbral no se pinta **nada** — ni un hueco.
 *
 * **Es un chip, no una banda.** Antes cruzaba el panel de lado a lado entre el hilo
 * y el composer y empujaba el transcript al aparecer. Ahora ocupa la columna del
 * composer, con el mismo ancho que la caja de escritura, así que avisa sin mover
 * nada de sitio.
 */
import { computed } from 'vue';

import { Alert } from '@components/ui/alert';

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
    class="flex items-center gap-2 rounded-panel border border-warning/40 bg-warning/10 px-3 py-2 text-caption text-ink"
  >
    <span>La memoria de este hilo va llena ({{ percent }} %). Mastra resumirá el historial en breve.</span>
  </Alert>
</template>
