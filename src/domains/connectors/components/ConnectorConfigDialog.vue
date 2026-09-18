<script setup lang="ts">
/**
 * @file src/domains/connectors/components/ConnectorConfigDialog.vue
 * @description Modal de configuración de una fuente, **por pasos**: conexión,
 * permisos y resumen. Trabaja sobre un borrador.
 *
 * El borrador lo prepara el shell (`editing`), que clona la fuente al abrirse, y
 * aquí se escribe sobre esa copia: solo "Guardar" la devuelve al catálogo. Cerrar
 * con la cruz, con `Escape` o con "Cancelar" descarta, que es lo que se espera de un
 * modal de configuración y lo que no pasaría si editara la fuente viva.
 *
 * **Por qué pasos.** Una configuración completa son dos decisiones —cómo se llega a
 * la fuente y qué se le deja hacer— y una cifra larga de campos y permisos en una
 * sola columna esconde la segunda mitad. El resumen final existe porque hasta ahora
 * el único momento en que se podía ver el conjunto era después de guardar.
 *
 * **La validación es de paso.** Los obligatorios vacíos bloquean el "Siguiente" del
 * primer paso, que es donde se puede explicar qué falta. Es la razón de que la
 * credencial caducada de la semilla se vea como lo que es: un campo que hay que
 * rellenar para seguir.
 *
 * Los campos y los permisos vienen de componentes compartidos con el asistente de
 * alta (`ConnectorFields`, `ScopeList`) y el riel también (`ConnectorSteps`): son la
 * misma forma sobre el mismo tipo de borrador, y duplicarlos dejaría dos sitios
 * donde añadir un campo.
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

import ConnectorFields from './ConnectorFields.vue';
import ConnectorSteps from './ConnectorSteps.vue';
import ScopeList from '../views/sources/ScopeList.vue';
import { CONNECTOR_COPY } from '../data/connectors.seed';
import { hasMissingRequired, useConnectors } from '../composables/useConnectors';
import type { WizardStep } from '../types/connector.types';

const { closeConfig, editing, saveConfig } = useConnectors();

const STEPS: WizardStep[] = [
  { step: 1, label: CONNECTOR_COPY.fieldSection },
  { step: 2, label: CONNECTOR_COPY.scopeSection },
  { step: 3, label: CONNECTOR_COPY.stepSummary },
];

const step = ref(1);

/** El modal se abre y se cierra con el borrador: una sola verdad, como el estudio. */
const open = computed({
  get: () => editing.value !== null,
  set: (value: boolean) => {
    if (!value) closeConfig();
  },
});

// Cada apertura empieza por el principio: el modal se abre para configurar, y
// recordar en qué paso se quedó una edición anterior confunde más que ayuda.
watch(open, (isOpen) => {
  if (isOpen) step.value = 1;
});

const lastStep = STEPS.length;

/** Los campos obligatorios vacíos bloquean el avance del primer paso. */
const connectionReady = computed(() => {
  const draft = editing.value;
  return draft !== null && !hasMissingRequired(draft.fields);
});

const canAdvance = computed(() => (step.value === 1 ? connectionReady.value : true));

/** Lo que se va a guardar, en cifras: el resumen no repite el formulario. */
const definedFields = computed(
  () => editing.value?.fields.filter((field) => field.value !== '').length ?? 0
);
const totalFields = computed(() => editing.value?.fields.length ?? 0);
const grantedScopes = computed(() => editing.value?.scopes.filter((scope) => scope.granted).length ?? 0);
const totalScopes = computed(() => editing.value?.scopes.length ?? 0);

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

function toggleScope(id: string, granted: boolean): void {
  const scope = editing.value?.scopes.find((entry) => entry.id === id);
  if (scope !== undefined) scope.granted = granted;
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="max-w-preview gap-0 overflow-hidden p-0 sm:max-w-preview">
      <DialogHeader class="gap-1 border-b border-line p-5 text-left">
        <DialogTitle>{{ CONNECTOR_COPY.configure }} · {{ editing?.name ?? '' }}</DialogTitle>
        <DialogDescription>{{ CONNECTOR_COPY.connectionHint }}</DialogDescription>
      </DialogHeader>

      <div class="max-h-[70svh] overflow-y-auto p-5">
        <ConnectorSteps :steps="STEPS" :current="step" @update:current="onStepChange" />

        <!-- Paso 1: conexión. -->
        <div v-if="step === 1" class="mt-4 flex flex-col gap-3">
          <ConnectorFields
            :fields="editing?.fields ?? []"
            :id-prefix="`connector-${editing?.id ?? 'nuevo'}`"
          />
          <p v-if="!connectionReady" class="text-caption text-danger">{{ CONNECTOR_COPY.requiredHint }}</p>
        </div>

        <!-- Paso 2: permisos. -->
        <div v-else-if="step === 2" class="mt-4">
          <p class="mb-3 text-body-sm text-ink-muted">{{ CONNECTOR_COPY.scopeHint }}</p>
          <ScopeList :scopes="editing?.scopes ?? []" editable @toggle="toggleScope" />
        </div>

        <!-- Paso 3: resumen. -->
        <div v-else class="mt-4 flex flex-col gap-4">
          <p class="text-body-sm text-ink-muted">{{ CONNECTOR_COPY.summaryHint }}</p>

          <dl class="grid grid-cols-2 gap-3 rounded-panel border border-line bg-surface p-4">
            <div>
              <dt class="text-caption text-ink-muted">{{ CONNECTOR_COPY.summaryFields }}</dt>
              <dd class="text-label text-ink">{{ definedFields }} / {{ totalFields }}</dd>
            </div>
            <div>
              <dt class="text-caption text-ink-muted">{{ CONNECTOR_COPY.summaryScopes }}</dt>
              <dd class="text-label text-ink">
                {{ grantedScopes > 0 ? `${grantedScopes} / ${totalScopes}` : CONNECTOR_COPY.none }}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <DialogFooter class="gap-2 border-t border-line p-5 sm:justify-between">
        <Button variant="ghost" class="mr-auto" @click="closeConfig()">{{ CONNECTOR_COPY.cancel }}</Button>

        <span class="flex gap-2">
          <Button v-if="step > 1" variant="outline" @click="back()">{{ CONNECTOR_COPY.back }}</Button>
          <Button v-if="step < lastStep" :disabled="!canAdvance" @click="next()">{{ CONNECTOR_COPY.next }}</Button>
          <Button v-else @click="saveConfig()">{{ CONNECTOR_COPY.finish }}</Button>
        </span>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
