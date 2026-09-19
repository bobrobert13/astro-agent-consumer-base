<script setup lang="ts">
/**
 * @file src/domains/chat-studio/components/StudioPreviewDialog.vue
 * @description Vista previa de un recurso del panel de contexto.
 *
 * Es esqueleto: el cuerpo se compone con la semilla, no con el contenido real del
 * archivo. Aun así cada tipo tiene su forma —imagen, página con extracto, tabla,
 * tarjeta de enlace y reproductor—, que es lo que hace que el panel se pueda
 * evaluar de verdad.
 *
 * El reproductor usa el `Slider` del registry, que es una primitiva de reka-ui:
 * eso deja un elemento con estilos en línea escritos en runtime dentro del modal y
 * mantiene viva la comprobación de CSP del smoke de Electron (ADR-004), que
 * necesita justo eso.
 */
import { Pause, Play } from '@lucide/vue';
import { computed, ref } from 'vue';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@components/ui/dialog';
import { Slider } from '@components/ui/slider';
import StudioImageSlot from './StudioImageSlot.vue';
import { useStudioShell } from '../composables/useStudioShell';
import { PREVIEW_BODY, PREVIEW_SHEET_ROWS, RESOURCE_ICONS } from '../data/studio.seed';

const { preview, closePreview } = useStudioShell();

/** El modal se abre y se cierra con el recurso seleccionado: una sola verdad. */
const open = computed({
  get: () => preview.value !== null,
  set: (value: boolean) => {
    if (!value) closePreview();
  },
});

const kind = computed(() => preview.value?.kind ?? 'doc');
const icon = computed(() => RESOURCE_ICONS[kind.value]);
const paragraphs = computed(() => PREVIEW_BODY[kind.value]);

/** Cabecera y filas de la tabla de ejemplo, sin indexar sin guarda. */
const [sheetHead = [], ...sheetRows] = PREVIEW_SHEET_ROWS;

const playing = ref(false);
const progress = ref<number[]>([35]);
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="max-w-preview gap-0 overflow-hidden p-0 sm:max-w-preview">
      <DialogHeader class="flex-row items-center gap-3 border-b border-line p-4 text-left">
        <span class="grid size-9 shrink-0 place-items-center rounded-control bg-elevated text-ink-muted">
          <component :is="icon" class="size-4" aria-hidden="true" />
        </span>
        <span class="flex min-w-0 flex-1 flex-col">
          <DialogTitle class="truncate text-label">{{ preview?.name ?? '' }}</DialogTitle>
          <DialogDescription class="truncate">{{ preview?.meta ?? '' }}</DialogDescription>
        </span>
      </DialogHeader>

      <div class="max-h-[70svh] min-h-56 overflow-auto bg-canvas p-5">
        <!-- Imagen: el hueco queda listo para la imagen definitiva. -->
        <div v-if="kind === 'image'" class="grid place-items-center">
          <StudioImageSlot
            :name="`preview-${preview?.id ?? 'recurso'}`"
            class="h-80 w-full max-w-xl rounded-panel bg-elevated"
          />
        </div>

        <!-- Hoja de cálculo: tabla de ejemplo. -->
        <table v-else-if="kind === 'sheet'" class="w-full overflow-hidden rounded-panel bg-surface text-caption">
          <thead>
            <tr>
              <th
                v-for="cell in sheetHead"
                :key="cell"
                class="border-b border-line px-3 py-2 text-left font-semibold text-ink"
              >
                {{ cell }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in sheetRows" :key="row.join('|')">
              <td v-for="cell in row" :key="cell" class="border-b border-line px-3 py-2 text-ink-muted">
                {{ cell }}
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Audio: reproductor simulado. -->
        <div
          v-else-if="kind === 'audio'"
          class="mx-auto flex max-w-lg items-center gap-4 rounded-panel border border-line bg-surface p-4"
        >
          <button
            type="button"
            class="grid size-10 shrink-0 place-items-center rounded-full bg-brand-500 text-on-brand transition-colors hover:bg-brand-600"
            :aria-label="playing ? 'Pausar' : 'Reproducir'"
            @click="playing = !playing"
          >
            <Pause v-if="playing" class="size-4" aria-hidden="true" />
            <Play v-else class="size-4" aria-hidden="true" />
          </button>
          <Slider v-model="progress" :max="100" class="flex-1" aria-label="Posición del audio" />
          <span class="shrink-0 font-mono text-caption text-ink-muted">14:32</span>
        </div>

        <!-- Enlace: tarjeta con dominio y descripción. -->
        <div v-else-if="kind === 'link'" class="mx-auto max-w-xl rounded-panel border border-line bg-surface p-5">
          <p class="text-caption text-brand-600">example.com</p>
          <p class="mt-1.5 mb-2 text-title-sm text-ink">{{ preview?.name ?? '' }}</p>
          <p class="text-body-sm text-ink-muted">{{ paragraphs[0] ?? '' }}</p>
        </div>

        <!-- Documento: página con extracto. -->
        <div v-else class="mx-auto max-w-lg rounded-control bg-surface p-7 shadow-sm">
          <p v-for="(line, index) in paragraphs" :key="index" class="mb-3.5 text-body-sm text-ink-muted">
            {{ line }}
          </p>
          <div
            class="h-30 rounded-sm bg-[repeating-linear-gradient(to_bottom,var(--color-line)_0_8px,transparent_8px_20px)]"
            aria-hidden="true"
          />
        </div>
      </div>

      <DialogFooter class="border-t border-line p-4">
        <small>Vista previa de ejemplo</small>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
