<script setup lang="ts">
/**
 * @file src/domains/chat-studio/components/StudioComposer.vue
 * @description Caja de escritura: adjuntos, textarea, herramientas y
 * enviar/detener.
 *
 * Lee el estado del chat **directamente** del singleton de `useAgentChat`, sin
 * props: en Astro cada isla es su propia `createApp()`, así que el composable es
 * un singleton de módulo y cualquier componente del estudio ve el mismo estado.
 * Pasarlo por props obligaría a atravesar tres niveles para nada.
 *
 * El `Textarea` del registry trae `field-sizing-content`: crece con su contenido
 * de forma nativa, así que no hay `watch` midiendo `scrollHeight`. El suelo y el
 * techo son de token (`min-h-12`, `max-h-42`), no números sueltos.
 *
 * **Adjuntar es de verdad, y es un mock.** El botón abre el selector del sistema y
 * el archivo aparece como ficha con su nombre y su tamaño; al enviar, esa lista
 * viaja **dentro del texto** del mensaje para que el simulacro lo muestre, porque
 * el camino real —un `file` como parte del mensaje, subido por el transporte— no
 * existe todavía. Los adjuntos viven en `useStudioAttachments`, no aquí: este
 * componente se remonta al pasar del hero al hilo y su estado local se perdería
 * justo al enviar el primer mensaje.
 *
 * **`id="aac-composer"` no es decorativo**: `scripts/electron-smoke.mjs` lo usa
 * para comprobar que la isla hidrata en Chromium y para escribir el prompt de la
 * prueba. Cambiarlo sin actualizar el script deja el gate de verificación a
 * oscuras.
 */
import { ArrowUp, Paperclip, Square, X } from '@lucide/vue';
import { computed, ref } from 'vue';

import { Label } from '@components/ui/label';
import { Textarea } from '@components/ui/textarea';
import { useAgentChat } from '@domains/agent-chat';
import StudioComposerTools from './StudioComposerTools.vue';
import { attachmentSize, useStudioAttachments } from '../composables/useStudioAttachments';
import { useStudioSessions } from '../composables/useStudioSessions';
import { useStudioShell } from '../composables/useStudioShell';
import { COMPOSER_TOOLS_TRAILING, STUDIO_COPY } from '../data/studio.seed';
import type { ComposerTool, ComposerToolId } from '../types/studio.types';

// `text` es la fuente del borrador y vive en el composable compartido: por eso
// cambiar el composer de sitio (dentro del hero o acoplado abajo) no lo pierde.
const { canSubmit, isRunning, stop, submit, text, threadId } = useAgentChat();
const { openConnectors } = useStudioShell();
const sessions = useStudioSessions();

const {
  items: attachments,
  add: addAttachments,
  remove: removeAttachment,
  clear: clearAttachments,
  describe: describeAttachment,
} = useStudioAttachments();

const fileInput = ref<HTMLInputElement | null>(null);

/** Un adjunto solo ya es un mensaje: sin esto, no habría forma de enviarlo. */
const canSend = computed(() => canSubmit.value || attachments.value.length > 0);

/**
 * Cada herramienta, con lo que hace. El mapa es exhaustivo por tipo
 * (`ComposerToolId` es una unión cerrada), así que una herramienta nueva no puede
 * quedarse sin acción: si se añade a la semilla, esto no compila hasta que se
 * decida qué hace.
 */
const TOOL_ACTIONS: Record<ComposerToolId, () => void> = {
  connectors: () => openConnectors('fuentes'),
  attach: () => fileInput.value?.click(),
};

function onTool(tool: ComposerTool): void {
  TOOL_ACTIONS[tool.id]();
}

function onFiles(event: Event): void {
  const input = event.target as HTMLInputElement | null;
  if (input?.files != null) addAttachments(input.files);
  // Se vacía para que elegir el mismo archivo otra vez vuelva a disparar `change`.
  if (input !== null) input.value = '';
}

/** El texto que se envía: los adjuntos delante, y el cuerpo tal cual debajo. */
function withAttachments(body: string): string {
  if (attachments.value.length === 0) return body;

  const line = `${STUDIO_COPY.attachmentPrefix} ${attachments.value.map(describeAttachment).join(', ')}`;
  return body === '' ? line : `${line}\n\n${body}`;
}

function onSubmit(): void {
  const body = text.value.trim();
  const composed = withAttachments(body);
  if (composed === '') return;

  // El nombre del hilo sale de lo que escribió la persona, no de la lista de
  // adjuntos: "Adjuntos: informe.pdf…" como título de conversación no dice nada.
  if (body !== '') sessions.nameFromPrompt(threadId.value, body);

  // El motor envía lo que haya en el borrador, así que se compone ahí y se limpian
  // los adjuntos en el mismo gesto: si se limpiaran antes, el mensaje saldría sin
  // su lista, y si después, un fallo de envío la perdería.
  text.value = composed;
  clearAttachments();
  void submit();
}

function onKeydown(event: KeyboardEvent): void {
  // Enter envía; Shift+Enter deja el salto de línea nativo del textarea.
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    if (canSend.value) onSubmit();
  }
}
</script>

<template>
  <form class="mx-auto w-full max-w-composer" @submit.prevent="onSubmit">
    <div
      class="rounded-shell border border-line bg-surface px-4 pt-4 pb-3 shadow-sm transition-colors focus-within:border-brand-500/50 focus-within:ring-3 focus-within:ring-brand-500/15"
    >
      <ul v-if="attachments.length > 0" class="mb-2.5 flex flex-wrap gap-1.5">
        <li
          v-for="file in attachments"
          :key="file.id"
          class="flex min-w-0 items-center gap-1.5 rounded-control border border-line bg-elevated py-0.5 pr-1 pl-2 text-caption text-ink"
        >
          <Paperclip class="size-3.5 shrink-0 text-ink-muted" aria-hidden="true" />
          <span class="max-w-40 truncate">{{ file.name }}</span>
          <span class="shrink-0 text-ink-muted">{{ attachmentSize(file.size) }}</span>
          <button
            type="button"
            class="grid size-4.5 shrink-0 place-items-center rounded-sm text-ink-muted transition-colors hover:bg-line/60 hover:text-ink"
            :aria-label="`${STUDIO_COPY.removeAttachment}: ${file.name}`"
            @click="removeAttachment(file.id)"
          >
            <X class="size-3" aria-hidden="true" />
          </button>
        </li>
      </ul>

      <p v-if="attachments.length > 0" class="mb-1.5">
        <small>{{ STUDIO_COPY.attachmentsNote }}</small>
      </p>

      <Label class="sr-only" for="aac-composer">{{ STUDIO_COPY.composerLabel }}</Label>
      <Textarea
        id="aac-composer"
        v-model="text"
        rows="1"
        :placeholder="STUDIO_COPY.composerPlaceholder"
        class="max-h-42 min-h-12 w-full resize-none border-0 bg-transparent px-0 py-0 text-body shadow-none focus-visible:ring-0"
        @keydown="onKeydown"
      />

      <!-- El selector es del sistema y va oculto: la herramienta del composer es
           su disparador, así que no hay un control nativo a la vista. -->
      <input
        ref="fileInput"
        type="file"
        multiple
        class="sr-only"
        tabindex="-1"
        aria-hidden="true"
        @change="onFiles"
      />

      <div class="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-0.5">
          <StudioComposerTools :tools="COMPOSER_TOOLS_TRAILING" @pick="onTool" />
        </div>

        <div class="flex items-center gap-0.5">
          <button
            v-if="isRunning()"
            type="button"
            class="ml-2 grid size-8 shrink-0 place-items-center rounded-full bg-ink text-canvas transition-colors hover:bg-ink/80"
            aria-label="Detener la respuesta"
            @click="stop()"
          >
            <Square class="size-3.5" aria-hidden="true" />
          </button>
          <button
            v-else
            type="submit"
            :disabled="!canSend"
            class="ml-2 grid size-8 shrink-0 place-items-center rounded-full bg-brand-500 text-on-brand transition-colors hover:bg-brand-600 disabled:opacity-40"
            aria-label="Enviar mensaje"
          >
            <ArrowUp class="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  </form>
</template>
