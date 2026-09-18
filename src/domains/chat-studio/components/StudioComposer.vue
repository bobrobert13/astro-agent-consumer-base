<script setup lang="ts">
/**
 * @file src/domains/chat-studio/components/StudioComposer.vue
 * @description Caja de escritura: textarea, atajo de análisis, herramientas y
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
 * **`id="aac-composer"` no es decorativo**: `scripts/electron-smoke.mjs` lo usa
 * para comprobar que la isla hidrata en Chromium y para escribir el prompt de la
 * prueba. Cambiarlo sin actualizar el script deja el gate de verificación a
 * oscuras.
 */
import { ArrowUp, Sparkles, Square } from '@lucide/vue';
import { ref } from 'vue';

import { Label } from '@components/ui/label';
import { Textarea } from '@components/ui/textarea';
import { useAgentChat } from '@domains/agent-chat';
import StudioComposerTools from './StudioComposerTools.vue';
import { useStudioSessions } from '../composables/useStudioSessions';
import { useStudioShell } from '../composables/useStudioShell';
import { COMPOSER_TOOLS_LEADING, COMPOSER_TOOLS_TRAILING, STUDIO_COPY } from '../data/studio.seed';
import type { ComposerTool } from '../types/studio.types';

// `text` es la fuente del borrador y vive en el composable compartido: por eso
// cambiar el composer de sitio (dentro del hero o acoplado abajo) no lo pierde.
const { canSubmit, isRunning, stop, submit, text, threadId } = useAgentChat();
const { notYet } = useStudioShell();
const sessions = useStudioSessions();

const deepResearch = ref(true);

function onSubmit(): void {
  // El primer prompt bautiza la sesión: es lo que la hace reconocible en el
  // historial en vez de quedarse como "Nuevo chat" para siempre.
  sessions.nameFromPrompt(threadId.value, text.value);
  void submit();
}

function onKeydown(event: KeyboardEvent): void {
  // Enter envía; Shift+Enter deja el salto de línea nativo del textarea.
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    if (canSubmit.value) onSubmit();
  }
}

function onTool(tool: ComposerTool): void {
  notYet(tool.label);
}
</script>

<template>
  <form class="mx-auto w-full max-w-composer" @submit.prevent="onSubmit">
    <div
      class="rounded-shell border border-line bg-surface px-4 pt-4 pb-3 shadow-sm transition-colors focus-within:border-brand-500/50 focus-within:ring-3 focus-within:ring-brand-500/15"
    >
      <Label class="sr-only" for="aac-composer">{{ STUDIO_COPY.composerLabel }}</Label>
      <Textarea
        id="aac-composer"
        v-model="text"
        rows="1"
        :placeholder="STUDIO_COPY.composerPlaceholder"
        class="max-h-42 min-h-12 w-full resize-none border-0 bg-transparent px-0 py-0 text-body shadow-none focus-visible:ring-0"
        @keydown="onKeydown"
      />

      <div class="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-1">
          <button
            type="button"
            class="flex h-10 shrink-0 items-center gap-2 rounded-control border px-3.5 text-label transition-colors"
            :class="
              deepResearch
                ? 'border-brand-500/40 bg-brand-050 text-brand-600'
                : 'border-line text-ink-muted hover:bg-line/60'
            "
            :aria-pressed="deepResearch"
            @click="deepResearch = !deepResearch"
          >
            <Sparkles class="size-4 shrink-0" aria-hidden="true" />
            <span class="max-nav:hidden">Investigación profunda</span>
          </button>

          <span class="ml-1 flex items-center gap-0.5 rounded-control bg-elevated p-0.5">
            <StudioComposerTools :tools="COMPOSER_TOOLS_LEADING" @pick="onTool" />
          </span>
        </div>

        <div class="flex items-center gap-0.5">
          <StudioComposerTools :tools="COMPOSER_TOOLS_TRAILING" @pick="onTool" />

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
            :disabled="!canSubmit"
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
