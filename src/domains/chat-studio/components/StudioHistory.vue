<script setup lang="ts">
/**
 * @file src/domains/chat-studio/components/StudioHistory.vue
 * @description Historial de conversaciones, agrupado por fecha.
 *
 * Las entradas son **enlaces reales** a `/chat/<hilo>`, no botones: la URL es el
 * contrato entre vistas en este repositorio, y así la lista deja de ser decorativa
 * —al pulsar se navega de verdad y la isla sobrevive gracias a
 * `transition:persist`, que es justo lo que hay que poder comprobar.
 *
 * La lista sale de `useStudioSessions`: la semilla **más las sesiones creadas** en
 * esta visita, que es lo que hace que "nuevo chat" aparezca aquí en cuanto se
 * pulsa. El desvanecido por antigüedad de la plantilla se conserva: la opacidad
 * marca jerarquía visual en una lista que crece hacia arriba.
 */
import { routes } from '@config/routes';
import { useStudioSessions } from '../composables/useStudioSessions';

interface Props {
  /** Hilo abierto ahora mismo; se marca con `aria-current`. */
  activeThreadId?: string | undefined;
}

const props = defineProps<Props>();

const { groups } = useStudioSessions();
</script>

<template>
  <div class="mt-1 flex flex-col">
    <template v-for="group in groups" :key="group.label">
      <p
        class="mt-4 mb-1.5 text-caption font-semibold tracking-widest text-ink-muted uppercase"
        :class="group.faded === true ? 'opacity-60' : ''"
      >
        {{ group.label }}
      </p>

      <a
        v-for="entry in group.entries"
        :key="entry.id"
        :href="routes.chat(entry.threadId)"
        :aria-current="entry.threadId === props.activeThreadId ? 'page' : undefined"
        class="flex h-6.5 items-center rounded-control pr-1.5 pl-5 text-body-sm text-ink transition-colors hover:bg-line/60"
        :class="[
          entry.faded === true ? 'opacity-60' : '',
          entry.threadId === props.activeThreadId ? 'bg-line/50 font-medium' : '',
        ]"
      >
        <span class="truncate">{{ entry.label }}</span>
      </a>
    </template>
  </div>
</template>
