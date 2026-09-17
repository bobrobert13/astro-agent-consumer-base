<script setup lang="ts">
/**
 * @file src/domains/chat-studio/components/StudioStatusBar.vue
 * @description Franja de estado de la ejecución: conectando, generando, sin
 * respuesta, o con la acción de detener.
 *
 * Existe para que el estado de la ejecución sea visible: un chat que se queda
 * callado a media ejecución sin decir nada se lee como una app rota. El estado
 * sale de `useChat` más el vigilante de silencio (`useStallWatchdog`), que es lo
 * único que distingue "el agente está pensando" de "el upstream se ha muerto".
 *
 * Se pinta con el `Alert` del registry porque es una banda de aviso con acciones,
 * no un div con colores. Dos desvíos, ambos deliberados:
 *
 *  - `role="status"` en vez del `role="alert"` que trae la primitiva: la franja
 *    cambia de texto en cada fase, y como región *assertive* un lector de pantalla
 *    interrumpiría en cada transición.
 *  - La forma es una fila y no la rejilla icono + contenido de `Alert`: aquí el
 *    contenido es una línea con un botón al final.
 *
 * **`aria-label="Estado de la ejecución"` es contrato con los tests**: distinguen
 * esta franja del aviso de memoria (que también es `role="status"` y, a
 * diferencia de esta, persiste mientras la memoria siga llena).
 */
import { computed } from 'vue';

import { Alert } from '@components/ui/alert';
import { Button } from '@components/ui/button';
import { Skeleton } from '@components/ui/skeleton';
import type { StreamState } from '@domains/agent-chat';

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
const working = computed(() => props.state === 'connecting' || props.state === 'streaming');
const canStop = computed(() => working.value);
</script>

<template>
  <Alert
    v-if="visible"
    role="status"
    aria-live="polite"
    aria-label="Estado de la ejecución"
    :variant="state === 'error' ? 'destructive' : 'default'"
    class="flex items-center gap-2 rounded-none border-x-0 border-b-0 bg-elevated px-8 py-1.5 text-caption max-nav:px-4"
    :class="state === 'stalled' ? 'text-warning' : state === 'error' ? '' : 'text-ink-muted'"
  >
    <Skeleton v-if="working" class="size-2 rounded-full bg-brand-500" aria-hidden="true" />
    <span>{{ label }}</span>
    <Button v-if="canStop" variant="ghost" size="xs" class="ml-auto" @click="$emit('stop')">Detener</Button>
    <Button v-else-if="state === 'stalled'" variant="ghost" size="xs" class="ml-auto" @click="$emit('retry')">
      Reintentar
    </Button>
  </Alert>
</template>
