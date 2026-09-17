<script setup lang="ts">
/**
 * @file src/domains/chat-studio/components/StudioSidebar.vue
 * @description Rail de navegación: marca, chat nuevo, secciones, historial y
 * tarjeta de usuario.
 *
 * Es el mismo bloque para escritorio y móvil, y lo decide el CSS con los puntos
 * de corte del estudio: en escritorio encoge con `margin-left` negativo (que es
 * como lo hace la plantilla y como se anima sin reflow) y por debajo de `nav:` se
 * convierte en cajón con `translate`. Un solo juego de estado (`railOpen` +
 * `drawerOpen`) gobierna los dos, así que no hay dos verdades que sincronizar.
 */
import { PanelLeft, Plus, Settings } from '@lucide/vue';

import StudioHistory from './StudioHistory.vue';
import StudioImageSlot from './StudioImageSlot.vue';
import StudioNav from './StudioNav.vue';
import StudioUserCard from './StudioUserCard.vue';
import { useStudioShell } from '../composables/useStudioShell';
import { STUDIO_COPY, STUDIO_IMAGE_SLOTS } from '../data/studio.seed';

interface Props {
  /** Hilo abierto ahora mismo, para marcar su entrada del historial. */
  activeThreadId?: string | undefined;
}

const props = defineProps<Props>();

const { railOpen, drawerOpen, railLabel, closeNav, newChat, notYet } = useStudioShell();
</script>

<template>
  <aside
    aria-label="Navegación principal"
    class="flex w-sidebar shrink-0 flex-col border-r border-line bg-elevated transition-[margin-left,transform] duration-200 ease-out max-nav:fixed max-nav:inset-y-0 max-nav:left-0 max-nav:z-40 max-nav:shadow-float"
    :class="[
      railOpen ? 'nav:ml-0' : 'nav:-ml-sidebar',
      drawerOpen ? 'max-nav:translate-x-0' : 'max-nav:-translate-x-full',
    ]"
  >
    <div class="flex items-center justify-between px-6.5 pt-11">
      <!-- Hueco de la marca: la plantilla traía la suya y aquí no se copia. -->
      <StudioImageSlot :name="STUDIO_IMAGE_SLOTS.brand" class="h-8.5 w-24 rounded-control bg-line/60" />

      <button
        type="button"
        class="grid size-7 shrink-0 place-items-center rounded-control bg-line/60 text-ink-muted transition-colors hover:bg-line"
        :aria-label="railLabel"
        :title="railLabel"
        @click="closeNav()"
      >
        <PanelLeft class="size-4" aria-hidden="true" />
      </button>
    </div>

    <hr class="mt-8 h-px border-0 bg-line" />

    <div class="flex min-h-0 flex-1 flex-col overflow-y-auto px-6.5 pt-6 pb-4">
      <button
        type="button"
        class="flex h-11 w-full items-center gap-2 rounded-control bg-brand-500 px-4 text-body-sm font-semibold text-on-brand transition-colors hover:bg-brand-600"
        @click="newChat()"
      >
        <Plus class="size-4 shrink-0" aria-hidden="true" />
        <span>{{ STUDIO_COPY.newChat }}</span>
        <span class="ml-auto rounded-sm bg-on-brand/20 px-1.5 py-0.5 font-mono text-caption">⌘N</span>
      </button>

      <StudioNav />
      <StudioHistory :active-thread-id="props.activeThreadId" />
    </div>

    <div class="mt-auto px-6.5 pt-4 pb-6">
      <button
        type="button"
        class="flex h-9 w-full items-center gap-2 rounded-control px-1.5 text-left text-label text-ink transition-colors hover:bg-line/60"
        @click="notYet('Configuración')"
      >
        <Settings class="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
        <span>Configuración</span>
      </button>

      <hr class="my-3.5 h-px border-0 bg-line" />

      <StudioUserCard />
    </div>
  </aside>
</template>
