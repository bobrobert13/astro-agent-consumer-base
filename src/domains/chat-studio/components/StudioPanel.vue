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
 * **Un solo scroll por columna.** El panel es una columna flex con tres franjas
 * que no se pisan: cabecera (`shrink-0`), zona central (`flex-1 min-h-0`, que es
 * la única que scrollea) y pie (`shrink-0`). Los avisos de la ejecución viven
 * dentro de esas franjas —el turno en curso en el hilo, la memoria sobre el
 * composer— y no como bandas a todo lo ancho entre ellas: eran justo lo que
 * empujaba el transcript y descolocaba las alturas.
 *
 * El pie lleva las acciones flotantes **en su fila**, no encima: con la posición
 * absoluta anterior, el aviso legal pasaba por debajo de los botones en cuanto la
 * ventana se estrechaba.
 */
import { computed } from 'vue';

import { useAgentChat } from '@domains/agent-chat';
import StudioComposer from './StudioComposer.vue';
import StudioConnectBar from './StudioConnectBar.vue';
import StudioHero from './StudioHero.vue';
import StudioMemoryNotice from './StudioMemoryNotice.vue';
import StudioPanelHeader from './StudioPanelHeader.vue';
import StudioSuggestions from './StudioSuggestions.vue';
import StudioThread from './StudioThread.vue';

const { memoryPressure, messages, send, state, streamingText, text } = useAgentChat();

const empty = computed(() => messages.value.length === 0 && streamingText.value === '');

/**
 * ¿Es la primera ejecución del hilo? La etiqueta "Conectando con el agente…" solo
 * tiene sentido mientras la conexión no se ha establecido **nunca**; a partir de la
 * primera respuesta el SDK sigue pasando por `submitted` en cada envío, y repetir
 * el aviso es ruido. Se mide sobre el transcript y no sobre el estado del SDK por
 * eso mismo. El globo sintético de error no cuenta: no llegó a haber respuesta.
 */
const firstRun = computed(
  () => !messages.value.some((message) => message.role === 'assistant' && message.parts.length > 0)
);

/**
 * La tarjeta escribe el prompt y devuelve el foco al composer: el gesto natural
 * después de elegir una sugerencia es completarla, no enviarla a ciegas.
 */
function onSuggestion(prompt: string): void {
  text.value = prompt;
  document.getElementById('aac-composer')?.focus();
}

/**
 * Relanza el último prompt de la persona tras un `stalled`. Vive aquí y no en el
 * turno en curso porque quien conoce el transcript es el panel; el turno solo
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

    <!-- Estado vacío: el composer vive dentro del hero (ver cabecera). -->
    <div v-if="empty" class="min-h-0 flex-1 overflow-y-auto">
      <div
        class="mx-auto flex w-full min-w-0 max-w-composer flex-col items-center px-4 pt-10 pb-8 nav:px-8 nav:pt-16"
      >
        <StudioHero />

        <div class="mt-9 w-full">
          <StudioComposer />
          <StudioConnectBar />
        </div>

        <StudioSuggestions class="mt-5" @pick="onSuggestion" />
      </div>
    </div>

    <!--
      Conversación: el hilo es lo único que scrollea (`min-h-0 flex-1`); el turno
      en curso va dentro de él y el composer se acopla abajo con la memoria
      encima, en su misma columna centrada.
    -->
    <template v-else>
      <StudioThread class="min-h-0 flex-1" :state="state" :first-run="firstRun" @retry="onRetry" />

      <div class="shrink-0 px-4 pt-2 pb-1 nav:px-8">
        <div class="mx-auto w-full min-w-0 max-w-composer">
          <StudioMemoryNotice :pressure="memoryPressure" class="mb-2" />
          <StudioComposer />
        </div>
      </div>
    </template>

  </main>
</template>
