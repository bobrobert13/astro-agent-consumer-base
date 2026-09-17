<script setup lang="ts">
/**
 * @file src/domains/chat-studio/components/StudioPanelHeader.vue
 * @description Cabecera del panel: selector de modelo a la izquierda y acciones a
 * la derecha.
 *
 * Los controles de icono se escriben con utilidades de token y no con el `Button`
 * del registry porque su geometría es propia de la plantilla —32 px los sueltos y
 * 44 px los que llevan borde— y forzar esas medidas en las variantes del registry
 * sería pelearse con ellas. El botón con texto sí es del registry.
 */
import { Ellipsis, Link2, PanelRight, Share2 } from '@lucide/vue';

import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import StudioModelMenu from './StudioModelMenu.vue';
import { useStudioShell } from '../composables/useStudioShell';
import { STUDIO_RESOURCES } from '../data/studio.seed';

const { contextOpen, toggleContext, notYet } = useStudioShell();

/**
 * El contador sale de la semilla, que es estática por ahora. Cuando el panel lea
 * la conversación de verdad, este número vendrá del mismo sitio que las filas.
 */
const resourceCount = STUDIO_RESOURCES.length;

const iconButton =
  'grid size-8 place-items-center rounded-control text-ink-muted transition-colors hover:bg-line/60 hover:text-ink';
const borderedButton =
  'relative grid size-11 place-items-center rounded-control border border-line bg-surface text-ink-muted transition-colors hover:bg-line/60 hover:text-ink';
</script>

<template>
  <header class="flex shrink-0 items-center justify-between gap-3 border-b border-line px-8 py-4 max-nav:px-4">
    <StudioModelMenu />

    <div class="flex shrink-0 items-center gap-3">
      <button
        type="button"
        :class="borderedButton"
        aria-label="Panel de contexto"
        title="Panel de contexto"
        :aria-expanded="contextOpen"
        @click="toggleContext()"
      >
        <PanelRight class="size-4" aria-hidden="true" />
        <Badge
          v-if="resourceCount > 0"
          class="absolute -top-1 -right-1 h-4 min-w-4 rounded-full px-1 text-caption"
        >
          {{ resourceCount }}
        </Badge>
      </button>

      <button type="button" :class="iconButton" aria-label="Más opciones" @click="notYet('Más opciones')">
        <Ellipsis class="size-4" aria-hidden="true" />
      </button>

      <button
        type="button"
        :class="borderedButton"
        aria-label="Copiar enlace"
        title="Copiar enlace"
        @click="notYet('Copiar enlace')"
      >
        <Link2 class="size-4" aria-hidden="true" />
      </button>

      <Button variant="outline" size="lg" @click="notYet('Compartir')">
        <Share2 aria-hidden="true" />
        <span>Compartir</span>
      </Button>
    </div>
  </header>
</template>
