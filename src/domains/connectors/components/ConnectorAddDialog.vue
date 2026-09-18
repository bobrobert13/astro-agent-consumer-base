<script setup lang="ts">
/**
 * @file src/domains/connectors/components/ConnectorAddDialog.vue
 * @description Asistente de alta de una fuente: familia, conexión y permisos.
 *
 * **Por qué pasos.** Un alta tiene tres decisiones de naturaleza distinta —qué
 * tipo de fuente es, cómo se llega a ella y qué se le deja hacer— y en un solo
 * formulario las tres se mezclan en una columna larga donde no se ve el final. En
 * pasos, cada pantalla pide una cosa y el riel dice cuánto queda.
 *
 * **El paso 1 reconstruye el borrador.** Cambiar de familia no es cosmético: cada
 * tipo tiene sus campos y sus permisos, así que la plantilla se vuelve a aplicar
 * entera. Por eso el riel es `linear` y la familia se elige antes de escribir nada:
 * no se pierde trabajo que no existía.
 *
 * **La validación es de paso, no de final.** Los obligatorios del paso 2 —nombre y
 * campos marcados— bloquean el "Siguiente", que es donde se puede explicar qué
 * falta; dejarlos para el final obligaría a volver atrás sin decir a qué paso.
 *
 * En pantallas estrechas el riel de tres títulos no cabe: se cambia por una línea
 * "Paso 2 de 3 · Conexión", que informa lo mismo sin encoger nada.
 */
import { computed, ref, watch } from 'vue';

import { Button } from '@components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@components/ui/dialog';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import {
  Stepper,
  StepperIndicator,
  StepperItem,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from '@components/ui/stepper';

import ConnectorFields from './ConnectorFields.vue';
import ScopeList from '../views/sources/ScopeList.vue';
import { CONNECTOR_COPY, CONNECTOR_ICONS, CONNECTOR_KINDS } from '../data/connectors.seed';
import { hasMissingRequired, useConnectors } from '../composables/useConnectors';
import type { ConnectorKind } from '../types/connector.types';

const { adding, closeAdd, saveAdd, setAddingKind } = useConnectors();

/** Los pasos, en orden. El número es el que espera el `Stepper` (empieza en 1). */
const STEPS = [
  { step: 1, label: CONNECTOR_COPY.stepFamily },
  { step: 2, label: CONNECTOR_COPY.fieldSection },
  { step: 3, label: CONNECTOR_COPY.scopeSection },
] as const;

const step = ref(1);

const open = computed({
  get: () => adding.value !== null,
  set: (value: boolean) => {
    if (!value) closeAdd();
  },
});

// Cada alta empieza por el principio: reabrir el asistente donde se dejó
// confundiría más que ayudar, porque el borrador anterior ya no existe.
watch(open, (isOpen) => {
  if (isOpen) step.value = 1;
});

const currentStep = computed(() => STEPS.find((entry) => entry.step === step.value) ?? STEPS[0]);
const lastStep = STEPS.length;

/** Nombre y obligatorios del paso de conexión. */
const connectionReady = computed(() => {
  const draft = adding.value;
  if (draft === null) return false;
  if (draft.name.trim() === '') return false;
  return !hasMissingRequired(draft.fields);
});

const canAdvance = computed(() => (step.value === 2 ? connectionReady.value : true));

function onStepChange(value: number | undefined): void {
  if (typeof value === 'number') step.value = value;
}

function next(): void {
  if (!canAdvance.value || step.value >= lastStep) return;
  step.value += 1;
}

function back(): void {
  if (step.value > 1) step.value -= 1;
}

function onKind(kind: ConnectorKind): void {
  setAddingKind(kind);
}

function toggleScope(id: string, granted: boolean): void {
  const scope = adding.value?.scopes.find((entry) => entry.id === id);
  if (scope !== undefined) scope.granted = granted;
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="max-w-preview gap-0 overflow-hidden p-0 sm:max-w-preview">
      <DialogHeader class="gap-1 border-b border-line p-5 text-left">
        <DialogTitle>{{ CONNECTOR_COPY.addTitle }}</DialogTitle>
        <DialogDescription>{{ CONNECTOR_COPY.familyHint }}</DialogDescription>
      </DialogHeader>

      <div class="max-h-[70svh] overflow-y-auto p-5">
        <!--
          Cada separador va **dentro** de su item: es lo que reka-ui espera (lo
          pinta con el estado de ese paso, para que se vea hasta dónde se ha
          llegado) y fuera de él la inyección del contexto de item no existe. Los
          items crecen (`flex-1`) para que la línea rellene el hueco.
        -->
        <Stepper class="hidden items-center nav:flex" :model-value="step" @update:model-value="onStepChange">
          <StepperItem
            v-for="entry in STEPS"
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

            <StepperSeparator v-if="entry.step < lastStep" class="h-px flex-1" />
          </StepperItem>
        </Stepper>

        <p class="text-label text-ink-muted nav:hidden">
          {{ CONNECTOR_COPY.stepOf }} {{ step }} {{ CONNECTOR_COPY.of }} {{ lastStep }} · {{ currentStep.label }}
        </p>

        <!-- Paso 1: familia. -->
        <fieldset v-if="step === 1" class="mt-4">
          <legend class="sr-only">{{ CONNECTOR_COPY.stepFamily }}</legend>
          <div class="grid gap-3 sm:grid-cols-2">
            <button
              v-for="kind in CONNECTOR_KINDS"
              :key="kind.id"
              type="button"
              class="flex items-start gap-3 rounded-panel border p-3 text-left transition-colors"
              :class="
                adding?.kind === kind.id
                  ? 'border-brand-500/60 bg-brand-050'
                  : 'border-line bg-surface hover:border-brand-500/40'
              "
              :aria-pressed="adding?.kind === kind.id"
              @click="onKind(kind.id)"
            >
              <span class="grid size-9 shrink-0 place-items-center rounded-control bg-elevated text-ink-muted">
                <component :is="CONNECTOR_ICONS[kind.id]" class="size-4" aria-hidden="true" />
              </span>
              <span class="flex min-w-0 flex-col gap-0.5">
                <strong class="text-label text-ink">{{ kind.label }}</strong>
                <small>{{ kind.description }}</small>
              </span>
            </button>
          </div>
        </fieldset>

        <!-- Paso 2: conexión. -->
        <div v-else-if="step === 2 && adding !== null" class="mt-4 flex flex-col gap-4">
          <div class="flex flex-col gap-2">
            <Label for="connector-nuevo-nombre">{{ CONNECTOR_COPY.nameLabel }}</Label>
            <Input id="connector-nuevo-nombre" v-model="adding.name" />
          </div>

          <ConnectorFields :fields="adding.fields" id-prefix="connector-nuevo" />

          <p v-if="!connectionReady" class="text-caption text-danger">{{ CONNECTOR_COPY.requiredHint }}</p>
        </div>

        <!-- Paso 3: permisos. -->
        <div v-else-if="step === 3 && adding !== null" class="mt-4">
          <p class="mb-3 text-body-sm text-ink-muted">{{ CONNECTOR_COPY.scopeHint }}</p>
          <ScopeList :scopes="adding.scopes" editable @toggle="toggleScope" />
        </div>
      </div>

      <DialogFooter class="gap-2 border-t border-line p-5 sm:justify-between">
        <Button variant="ghost" class="mr-auto" @click="closeAdd()">{{ CONNECTOR_COPY.cancel }}</Button>

        <span class="flex gap-2">
          <Button v-if="step > 1" variant="outline" @click="back()">{{ CONNECTOR_COPY.back }}</Button>
          <Button v-if="step < lastStep" :disabled="!canAdvance" @click="next()">{{ CONNECTOR_COPY.next }}</Button>
          <Button v-else @click="saveAdd()">{{ CONNECTOR_COPY.create }}</Button>
        </span>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
