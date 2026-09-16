<script setup lang="ts">
/**
 * @file src/domains/agent-config/components/AgentConfigCard.vue
 * @description Formulario de perillas por ejecución. Isla hidratada: los
 * controles necesitan cliente, así que la página la monta con `client:visible`.
 *
 * La lista de agentes llega **por props**, resuelta en el servidor por la página.
 * Es lo que evita que este slice importe `@domains/agent-registry`: configurar un
 * agente no requiere conocer el contexto que lo cataloga.
 */
import { computed, onMounted, watch } from 'vue';
import { toast } from 'vue-sonner';

import { Button } from '@components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@components/ui/card';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@components/ui/select';
import { Separator } from '@components/ui/separator';
import { Slider } from '@components/ui/slider';
import { Switch } from '@components/ui/switch';
import { Alert, AlertDescription } from '@components/ui/alert';
import { Badge } from '@components/ui/badge';
import { Toaster } from '@components/ui/sonner';
import { CircleSlash, TriangleAlert } from '@lucide/vue';

import { useAgentConfig } from '../composables/useAgentConfig';

interface AgentOption {
  id: string;
  name: string;
}

const props = withDefaults(defineProps<{ agents?: AgentOption[]; initialAgentId?: string }>(), {
  initialAgentId: 'research-agent',
});

const config = useAgentConfig();
const selectedAgent = computed({
  get: () => config.agentId.value,
  set: (id: string) => void config.load(id),
});

/** El slider de reka trabaja con arrays; esta capa lo devuelve a un número. */
const temperatureRange = computed({
  get: () => [config.temperature.value],
  set: (value: number[]) => {
    const next = value[0];
    if (next !== undefined) config.temperature.value = next;
  },
});

onMounted(() => {
  const first = props.agents?.[0]?.id ?? props.initialAgentId;
  void config.load(first);
});

watch(
  () => props.initialAgentId,
  (id) => void config.load(id)
);

async function onSave(): Promise<void> {
  const result = await config.save();
  if (result.ok) {
    toast.success('Configuración guardada', {
      description: `${config.settings.value.model === '' ? 'modelo por defecto' : config.settings.value.model} · temperatura ${config.settings.value.temperature}`,
    });
    return;
  }
  toast.error('No se pudo guardar', { description: config.message.value ?? undefined });
}

const temperatureLabel = computed(() =>
  config.temperature.value <= 0.3 ? 'determinista' : config.temperature.value <= 0.9 ? 'equilibrada' : 'creativa'
);
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>Agente y ejecución</CardTitle>
      <CardDescription>Modelo, temperatura y memoria para las próximas respuestas.</CardDescription>
      <CardAction>
        <Badge v-if="config.dirty.value" variant="secondary">sin guardar</Badge>
        <Badge v-else-if="config.state.value === 'ready'" variant="outline">sincronizado</Badge>
      </CardAction>
    </CardHeader>

    <CardContent class="flex flex-col gap-6">
      <div v-if="(props.agents?.length ?? 0) === 0" class="flex flex-col gap-2">
        <Alert variant="warning">
          <TriangleAlert />
          <AlertDescription>
            El backend de agentes no respondió, así que no hay catálogo del que elegir. Puedes editar igualmente:
            se guardará contra el id activo.
          </AlertDescription>
        </Alert>
        <div class="flex flex-col gap-2">
          <Label for="agent-id">Id del agente</Label>
          <Input id="agent-id" :model-value="config.agentId.value" @update:model-value="config.load(String($event))" />
        </div>
      </div>

      <div v-else class="flex flex-col gap-2">
        <Label for="agent-select">Agente</Label>
        <Select id="agent-select" v-model="selectedAgent" :disabled="config.busy.value">
          <SelectTrigger class="w-full">
            <SelectValue placeholder="Elige un agente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="agent in props.agents" :key="agent.id" :value="agent.id">
              {{ agent.name }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div class="flex flex-col gap-2">
        <Label for="model">Modelo</Label>
        <Input
          id="model"
          v-model="config.model"
          :disabled="!config.canSave.value"
          placeholder="déjalo vacío para usar el del servidor"
          autocomplete="off"
        />
        <p class="text-xs text-muted-foreground">
          Se envía tal cual al backend. Si el proveedor no lo conoce, la ejecución falla con su propio error.
        </p>
      </div>

      <div class="flex flex-col gap-3">
        <div class="flex items-baseline justify-between gap-3">
          <Label for="temperature">Temperatura</Label>
          <span class="font-mono text-xs text-muted-foreground">
            {{ config.temperature.value.toFixed(1) }} · {{ temperatureLabel }}
          </span>
        </div>
        <Slider
          id="temperature"
          v-model="temperatureRange"
          :min="0"
          :max="2"
          :step="0.1"
          :disabled="!config.canSave.value"
        />
      </div>

      <div class="flex items-center justify-between gap-4">
        <div class="flex flex-col">
          <Label for="memory">Memoria de la conversación</Label>
          <span class="text-xs text-muted-foreground">
            Con ella apagada, cada mensaje se responde sin historial.
          </span>
        </div>
        <Switch
          id="memory"
          v-model="config.memoryEnabled"
          :disabled="!config.canSave.value"
          class="shrink-0"
        />
      </div>

      <Alert v-if="config.message.value !== undefined" variant="destructive">
        <CircleSlash />
        <AlertDescription>{{ config.message.value }}</AlertDescription>
      </Alert>
    </CardContent>

    <CardFooter class="flex-col items-stretch gap-0">
      <Separator class="mb-4" />
      <div class="flex items-center justify-end gap-2">
        <Button variant="ghost" :disabled="!config.dirty.value" @click="config.revert()">Descartar</Button>
        <Button :disabled="!config.dirty.value || config.busy.value" @click="onSave">
          {{ config.state.value === 'saving' ? 'Guardando…' : 'Guardar' }}
        </Button>
      </div>
    </CardFooter>
  </Card>

  <!-- El contenedor de toasts vive en la isla que los emite: montarlo en un
       `.astro` sin directiva no serviría de nada (vue-sonner necesita cliente). -->
  <Toaster position="bottom-center" />
</template>
