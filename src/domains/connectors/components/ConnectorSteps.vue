<script setup lang="ts">
/**
 * @file src/domains/connectors/components/ConnectorSteps.vue
 * @description Riel de pasos de un asistente: el `Stepper` del registry más su
 * relevo en pantallas estrechas.
 *
 * Los dos modales del panel —configurar y añadir— numeran pasos distintos, así que
 * el riel se comparte y lo único que cambia es la lista. Por debajo de `nav:` los
 * tres títulos no caben, y encogerlos o recortarlos dejaría pasos sin nombre: se
 * cambian por una línea —"Paso 2 de 3 · Permisos"— que informa lo mismo.
 *
 * **Los separadores van dentro de su item.** Es donde reka-ui los espera (los pinta
 * con el estado de ese paso, para que se vea hasta dónde se ha llegado) y fuera de
 * él la inyección del contexto de item no existe: el árbol entra en un bucle de
 * renders que Vue corta con "Maximum recursive updates exceeded".
 */
import { computed } from 'vue';

import {
  Stepper,
  StepperIndicator,
  StepperItem,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from '@components/ui/stepper';

import { CONNECTOR_COPY } from '../data/connectors.seed';
import type { WizardStep } from '../types/connector.types';

interface Props {
  steps: WizardStep[];
  /** Paso activo, 1-based como el `Stepper`. */
  current: number;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:current': [step: number];
}>();

const currentLabel = computed(() => props.steps.find((entry) => entry.step === props.current)?.label ?? '');

/** El `update:modelValue` del registry puede llegar `undefined` al deseleccionar. */
function onChange(value: number | undefined): void {
  if (typeof value === 'number') emit('update:current', value);
}
</script>

<template>
  <div>
    <Stepper class="hidden items-center nav:flex" :model-value="props.current" @update:model-value="onChange">
      <StepperItem
        v-for="entry in props.steps"
        :key="entry.step"
        :step="entry.step"
        class="flex-1 items-center gap-3"
      >
        <StepperTrigger class="flex-row items-center gap-2">
          <StepperIndicator class="size-7">
            <span class="text-caption font-semibold">{{ entry.step }}</span>
          </StepperIndicator>
          <StepperTitle class="text-label">{{ entry.label }}</StepperTitle>
        </StepperTrigger>

        <StepperSeparator v-if="entry.step < props.steps.length" class="h-px flex-1" />
      </StepperItem>
    </Stepper>

    <p class="text-label text-ink-muted nav:hidden">
      {{ CONNECTOR_COPY.stepOf }} {{ props.current }} {{ CONNECTOR_COPY.of }} {{ props.steps.length }} ·
      {{ currentLabel }}
    </p>
  </div>
</template>
