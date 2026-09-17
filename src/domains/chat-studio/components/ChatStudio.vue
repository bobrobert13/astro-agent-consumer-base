<script setup lang="ts">
/**
 * @file src/domains/chat-studio/components/ChatStudio.vue
 * @description Raíz del estudio: es lo único que monta un `.astro` y lo único
 * que llama a `provideStudioShell()`.
 *
 * **Por qué el estudio entero es una isla.** El chrome es interactivo (rail,
 * cajón, menús, panel de contexto, modal) y además el stream del agente tiene que
 * sobrevivir a la navegación entre `/` y `/chat/<hilo>`. Como el motor del chat
 * (`useAgentChat` → AI SDK) solo existe en el navegador, una isla que contenga el
 * hilo no puede renderizarse en servidor; y partir el chrome en islas hermanas
 * obligaría a gobernar desde fuera un DOM que ya no les pertenece. Se monta pues
 * con `client:only` y `transition:persist`, y el hueco previo a la hidratación lo
 * cubre el `slot="fallback"` del layout.
 *
 * El `Toaster` es asíncrono a propósito: son ~20 KB de `vue-sonner` que no hacen
 * falta para ver la pantalla y que no deben entrar en el grafo inicial de la isla.
 */
import { defineAsyncComponent } from 'vue';

import { PanelLeft } from '@lucide/vue';

import StudioSidebar from './StudioSidebar.vue';
import { useStudioShortcuts } from '../composables/useStudioShortcuts';
import { provideStudioShell } from '../composables/useStudioShell';
import { DEFAULT_AGENT_ID, NEW_THREAD_ID } from '@config/app';

const props = withDefaults(
  defineProps<{
    /** Agente activo. Viaja en `?agente=`; el default es la única fuente en config. */
    agentId?: string;
    /** Hilo activo. Viaja en el segmento de ruta. */
    threadId?: string;
  }>(),
  { agentId: DEFAULT_AGENT_ID, threadId: NEW_THREAD_ID }
);

// El `provide` va antes de montar los atajos: `useStudioShortcuts` lo consume.
const { railOpen, drawerOpen, openNav } = provideStudioShell();
useStudioShortcuts();

const Toaster = defineAsyncComponent(() => import('@/components/ui/sonner/Sonner.vue'));
</script>

<template>
  <div class="flex h-svh overflow-hidden bg-canvas text-ink">
    <StudioSidebar :active-thread-id="props.threadId" />

    <!--
      Botón de reapertura del rail. Se enseña cuando el rail está contraído (en
      escritorio) o siempre en móvil, donde el cajón arranca cerrado; y se esconde
      si el cajón está abierto, porque entonces ya hay navegación en pantalla.
    -->
    <button
      type="button"
      class="fixed top-9 left-9 z-50 grid size-11 place-items-center rounded-control border border-line bg-surface text-ink-muted shadow-sm transition-colors hover:bg-elevated"
      :class="[railOpen ? 'nav:hidden' : '', drawerOpen ? 'max-nav:hidden' : '']"
      :aria-label="railOpen ? 'Expandir navegación' : 'Abrir navegación'"
      @click="openNav()"
    >
      <PanelLeft class="size-4" aria-hidden="true" />
    </button>

    <div class="flex min-w-0 flex-1 pt-4.5 pr-5 pb-4.5 max-nav:p-3">
      <main
        aria-label="Conversación con el agente"
        class="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-shell border border-line bg-surface"
      >
        <!-- Fase 3 trae aquí la cabecera, el estado vacío y el composer. -->
        <div class="grid flex-1 place-content-center p-8 text-center">
          <p class="text-label text-ink-muted">Estudio en construcción</p>
        </div>
      </main>
    </div>

    <Toaster position="bottom-center" />
  </div>
</template>
