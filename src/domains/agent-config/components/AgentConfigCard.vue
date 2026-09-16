<script setup lang="ts">
/**
 * @file src/domains/agent-config/components/AgentConfigCard.vue
 * @description Formulario de perillas por ejecución. Isla hidratada: los
 * controles necesitan cliente, así que la página la monta con `client:visible`.
 *
 * La lista de agentes llega **por props**, resuelta en el servidor por la página.
 * Es lo que evita que este slice importe `@domains/agent-registry`: configurar un
 * agente no requiere conocer el contexto que lo cataloga.
 *
 * **Por qué los refs del composable se desestructuran** (trampa de ADR-002, con
 * bug detrás): `useAgentConfig()` devuelve un objeto plano con refs dentro, y Vue
 * solo desenvuelve los refs de nivel superior del `setup()`. Con
 * `v-model="config.model"` el prop recibía el `ComputedRef` entero (de ahí
 * "Invalid prop … got Object") y el compilador generaba una asignación a la
 * propiedad del objeto, que **sustituía el computed por el texto tecleado**:
 * el input se veía escribir, pero nada llegaba a `settings` y el formulario nunca
 * se marcaba sucio. Desestructurar deja cada ref como binding de nivel superior,
 * que es lo que el template sí desenvuelve (igual que `selectedAgent` y
 * `temperatureRange`, que ya funcionaban por ser locales).
 */
import { computed, defineAsyncComponent, onMounted, watch } from 'vue';

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
import { CircleSlash, TriangleAlert } from '@lucide/vue';

import { useAgentConfig } from '../composables/useAgentConfig';
import type { AgentRunSettings } from '../types/agent-config.types';

interface AgentOption {
  id: string;
  name: string;
}

const props = withDefaults(
  defineProps<{
    agents?: AgentOption[];
    initialAgentId?: string;
    /**
     * Config resuelta por la página durante el render. Es lo que hace que el
     * formulario llegue **habilitado** en el HTML, en vez de esperar a hidratar y
     * a que vuelva un `GET` (ver `settings.astro`).
     */
    initialSettings?: AgentRunSettings | undefined;
  }>(),
  { initialAgentId: 'research-agent' }
);

const {
  agentId,
  busy,
  canSave,
  dirty,
  load,
  memoryEnabled,
  message,
  model,
  revert,
  save,
  settings,
  state,
  temperature,
} = useAgentConfig({ agentId: props.initialAgentId, initial: props.initialSettings });

const selectedAgent = computed({
  get: () => agentId.value,
  set: (id: string) => void load(id),
});

/** El slider de reka trabaja con arrays; esta capa lo devuelve a un número. */
const temperatureRange = computed({
  get: () => [temperature.value],
  set: (value: number[]) => {
    const next = value[0];
    if (next !== undefined) temperature.value = next;
  },
});

onMounted(() => {
  // Con la config ya resuelta no hay nada que pedir: pedirla otra vez era gastar
  // un viaje para volver al mismo sitio.
  if (props.initialSettings !== undefined) return;
  void load(props.agents?.[0]?.id ?? props.initialAgentId);
});

watch(
  () => props.initialAgentId,
  (id) => void load(id)
);

/**
 * `vue-sonner` entra por `import()` al primer aviso, y el `Toaster` como
 * componente asíncrono: son ~20 KB que no hacen falta para *editar* el
 * formulario, y antes venían dentro del chunk de esta isla, así que había que
 * descargarlos y parsearlos antes de poder hidratar la tarjeta.
 *
 * El `Toaster` se sigue montando casi enseguida (Vue resuelve los componentes
 * asíncronos al primer render), así que cuando alguien pulsa Guardar ya está
 * listo y el aviso no se pierde.
 */
const Toaster = defineAsyncComponent(() => import('@/components/ui/sonner/Sonner.vue'));

async function notify(kind: 'success' | 'error', title: string, description: string | undefined): Promise<void> {
  const { toast } = await import('vue-sonner');
  const options = description === undefined ? {} : { description };
  if (kind === 'success') toast.success(title, options);
  else toast.error(title, options);
}

async function onSave(): Promise<void> {
  const result = await save();
  if (result.ok) {
    await notify(
      'success',
      'Configuración guardada',
      `${settings.value.model === '' ? 'modelo por defecto' : settings.value.model} · temperatura ${settings.value.temperature}`
    );
    return;
  }
  await notify('error', 'No se pudo guardar', message.value);
}

const temperatureLabel = computed(() =>
  temperature.value <= 0.3 ? 'determinista' : temperature.value <= 0.9 ? 'equilibrada' : 'creativa'
);
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>Agente y ejecución</CardTitle>
      <CardDescription>Modelo, temperatura y memoria para las próximas respuestas.</CardDescription>
      <CardAction>
        <Badge v-if="dirty" variant="secondary">sin guardar</Badge>
        <Badge v-else-if="state === 'ready'" variant="outline">sincronizado</Badge>
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
          <Input id="agent-id" :model-value="agentId" @update:model-value="load(String($event))" />
        </div>
      </div>

      <div v-else class="flex flex-col gap-2">
        <Label for="agent-select">Agente</Label>
        <Select id="agent-select" v-model="selectedAgent" :disabled="busy">
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
          v-model="model"
          :disabled="!canSave"
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
            {{ temperature.toFixed(1) }} · {{ temperatureLabel }}
          </span>
        </div>
        <Slider
          id="temperature"
          v-model="temperatureRange"
          :min="0"
          :max="2"
          :step="0.1"
          :disabled="!canSave"
        />
      </div>

      <div class="flex items-center justify-between gap-4">
        <div class="flex flex-col">
          <Label for="memory">Memoria de la conversación</Label>
          <span class="text-xs text-muted-foreground">
            Con ella apagada, cada mensaje se responde sin historial.
          </span>
        </div>
        <Switch id="memory" v-model="memoryEnabled" :disabled="!canSave" class="shrink-0" />
      </div>

      <Alert v-if="message !== undefined" variant="destructive">
        <CircleSlash />
        <AlertDescription>{{ message }}</AlertDescription>
      </Alert>
    </CardContent>

    <CardFooter class="flex-col items-stretch gap-0">
      <Separator class="mb-4" />
      <div class="flex items-center justify-end gap-2">
        <Button variant="ghost" :disabled="!dirty" @click="revert()">Descartar</Button>
        <Button :disabled="!dirty || busy" @click="onSave">
          {{ state === 'saving' ? 'Guardando…' : 'Guardar' }}
        </Button>
      </div>
    </CardFooter>
  </Card>

  <!-- El contenedor de toasts vive en la isla que los emite: montarlo en un
       `.astro` sin directiva no serviría de nada (vue-sonner necesita cliente). -->
  <Toaster position="bottom-center" />
</template>
