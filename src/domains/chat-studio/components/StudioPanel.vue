<script setup lang="ts">
/**
 * @file src/domains/chat-studio/components/StudioPanel.vue
 * @description Panel central: cabecera, estado vacío o conversación, composer y
 * pie.
 *
 * **Dos posiciones para un solo composer.** En el estado vacío la caja de
 * escritura va dentro del bloque del hero, donde la pone la plantilla; en cuanto
 * hay conversación se acopla abajo, que es lo que hace usable un chat de verdad
 * —la plantilla original escondía el composer con el hero y dejaba el hilo sin
 * forma de continuar—. Como los dos sitios son excluyentes (`v-if`/`v-else`),
 * nunca hay dos campos con el id `aac-composer` en el documento, y el borrador no se pierde al
 * cambiar de sitio porque vive en el composable compartido.
 *
 * El pie se queda fijo abajo en vez de viajar con el scroll: ocupa una línea y
 * mantiene el aviso a la vista sin robar altura al transcript.
 */
import { computed } from 'vue';

import { useAgentChat } from '@domains/agent-chat';
import StudioComposer from './StudioComposer.vue';
import StudioConnectBar from './StudioConnectBar.vue';
import StudioFabs from './StudioFabs.vue';
import StudioHero from './StudioHero.vue';
import StudioMemoryNotice from './StudioMemoryNotice.vue';
import StudioPanelHeader from './StudioPanelHeader.vue';
import StudioStatusBar from './StudioStatusBar.vue';
import StudioSuggestions from './StudioSuggestions.vue';
import StudioThread from './StudioThread.vue';
import { useStudioShell } from '../composables/useStudioShell';
import { STUDIO_COPY } from '../data/studio.seed';

const { memoryPressure, messages, send, state, stop, streamingText, text } = useAgentChat();
const { notYet } = useStudioShell();

const empty = computed(() => messages.value.length === 0 && streamingText.value === '');

/**
 * La tarjeta escribe el prompt y devuelve el foco al composer: el gesto natural
 * después de elegir una sugerencia es completarla, no enviarla a ciegas.
 */
function onSuggestion(prompt: string): void {
  text.value = prompt;
  document.getElementById('aac-composer')?.focus();
}

/**
 * Relanza el último prompt de la persona tras un `stalled`. Vive aquí y no en la
 * franja de estado porque quien conoce el transcript es el panel; la franja solo
 * avisa de que hay algo que reintentar.
 */
function onRetry(): void {
  const last = [...messages.value].reverse().find((message) => message.role === 'user');
  const prompt = last?.parts.find((part) => part.type === 'text')?.text;
  if (typeof prompt === 'string') void send(prompt);
}
</script>

<template>
  <main
    aria-label="Conversación con el agente"
    class="relative flex h-full min-h-0 w-full flex-col overflow-hidden rounded-shell border border-line bg-surface"
  >
    <StudioPanelHeader />

    <div class="flex min-h-0 flex-1 flex-col">
      <div v-if="empty" class="min-h-0 flex-1 overflow-y-auto">
        <div class="flex flex-col items-center px-8 pt-21 pb-6 max-nav:pt-10">
          <StudioHero />

          <div class="mt-9 w-full max-w-composer">
            <StudioComposer />
            <StudioConnectBar />
          </div>

          <StudioSuggestions class="mt-5" @pick="onSuggestion" />
        </div>
      </div>

      <template v-else>
        <StudioThread class="min-h-0 flex-1" />

        <!--
          Los dos avisos van entre el hilo y el composer: son estado de la
          ejecución, no contenido de la conversación, y ahí quedan a la vista sin
          robarle altura al transcript.
        -->
        <StudioMemoryNotice :pressure="memoryPressure" />
        <StudioStatusBar :state="state" @stop="stop" @retry="onRetry" />

        <StudioComposer class="w-full shrink-0 px-8 pt-2 pb-4" />
      </template>

      <!--
        El relleno lateral es ancho a propósito: deja libre la esquina donde
        flotan las acciones (`StudioFabs`), que se apoyan sobre esta franja en
        vez de sobre el composer.
      -->
      <footer class="shrink-0 px-20 pt-6 pb-5 text-center text-caption text-ink-muted max-nav:px-4">
        {{ STUDIO_COPY.disclaimer }}
        <button
          type="button"
          class="font-medium underline-offset-2 hover:underline"
          @click="notYet(STUDIO_COPY.disclaimerLink)"
        >
          {{ STUDIO_COPY.disclaimerLink }}
        </button>
      </footer>
    </div>

    <StudioFabs />
  </main>
</template>
