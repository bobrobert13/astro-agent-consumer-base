<script setup lang="ts">
/**
 * @file src/domains/settings/views/SettingsPanel.vue
 * @description El espacio de configuración dentro del panel lateral del estudio.
 *
 * **Es contenido, no cajón**, igual que el de conectores: el ancho, el cierre, la
 * densidad compacta y el `inert` los pone `StudioSidePanel`. Aquí solo hay lo que se
 * configura.
 *
 * **Qué es real.** El tema, que se aplica al instante contra el store global: es
 * preferencia de interfaz, existe desde antes que este panel y hasta ahora solo se
 * podía cambiar desde el menú de la tarjeta de usuario. Las tres preferencias de
 * chat son de ejemplo, así que la primera línea lo dice: un control que parece
 * guardar algo y no llega a la conversación es peor que no tenerlo, y decirlo es más
 * barato que fingirlo.
 *
 * **Los ajustes van en filas**, etiqueta a la izquierda y control a la derecha, en
 * vez de una columna de campos con su etiqueta encima: en 340 px son la mitad de
 * altos, y una lista de ajustes se lee así desde siempre. El tema es la excepción
 * —tres opciones cortas y excluyentes— y va segmentado, que resuelve lo mismo en un
 * clic.
 */
import { Settings, X } from '@lucide/vue';

import { Button } from '@components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@components/ui/select';
import { Switch } from '@components/ui/switch';

import { AGENT_OPTIONS, MODEL_OPTIONS, SETTINGS_COPY, THEME_OPTIONS } from '../data/settings.seed';
import { useSettings } from '../composables/useSettings';

const emit = defineEmits<{
  close: [];
}>();

const { theme, setTheme, chat, setAgent, setModel, setSendOnEnter } = useSettings();

/** reka-ui entrega el valor del `Select` sin tipar; se estrecha aquí. */
function onSelect(value: unknown, apply: (id: string) => void): void {
  if (typeof value === 'string') apply(value);
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <header class="flex shrink-0 items-center gap-1 border-b border-line px-3 py-2">
      <span class="grid size-7 shrink-0 place-items-center rounded-control bg-brand-050 text-brand-600">
        <Settings class="size-3.5" aria-hidden="true" />
      </span>

      <strong class="min-w-0 flex-1 truncate text-label text-ink">{{ SETTINGS_COPY.title }}</strong>

      <Button
        variant="ghost"
        size="icon-sm"
        :aria-label="SETTINGS_COPY.close"
        :title="SETTINGS_COPY.close"
        @click="emit('close')"
      >
        <X aria-hidden="true" />
      </Button>
    </header>

    <div class="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
      <p class="pt-3">
        <small>{{ SETTINGS_COPY.note }}</small>
      </p>

      <section class="mt-4">
        <h2 class="text-label text-ink">{{ SETTINGS_COPY.appearance }}</h2>

        <div
          role="group"
          :aria-label="SETTINGS_COPY.themeLabel"
          class="mt-2 grid grid-cols-3 gap-0.5 rounded-control bg-elevated p-0.5"
        >
          <button
            v-for="option in THEME_OPTIONS"
            :key="option.id"
            type="button"
            class="flex min-w-0 items-center justify-center gap-1.5 rounded-sm px-2 py-1.5 text-caption font-medium transition-colors"
            :class="theme === option.id ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted hover:text-ink'"
            :aria-pressed="theme === option.id"
            @click="setTheme(option.id)"
          >
            <component :is="option.icon" class="size-3.5 shrink-0" aria-hidden="true" />
            <span class="truncate">{{ option.label }}</span>
          </button>
        </div>
      </section>

      <section class="mt-5">
        <h2 class="text-label text-ink">{{ SETTINGS_COPY.chat }}</h2>

        <div class="mt-2 flex flex-col gap-3">
          <div class="flex items-center justify-between gap-3">
            <span class="min-w-0 truncate text-label text-ink">{{ SETTINGS_COPY.agent }}</span>
            <Select :model-value="chat.agentId" @update:model-value="onSelect($event, setAgent)">
              <SelectTrigger size="sm" class="w-36 shrink-0" :aria-label="SETTINGS_COPY.agent">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="option in AGENT_OPTIONS" :key="option.id" :value="option.id">
                  {{ option.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="flex items-center justify-between gap-3">
            <span class="min-w-0 truncate text-label text-ink">{{ SETTINGS_COPY.model }}</span>
            <Select :model-value="chat.modelId" @update:model-value="onSelect($event, setModel)">
              <SelectTrigger size="sm" class="w-36 shrink-0" :aria-label="SETTINGS_COPY.model">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="option in MODEL_OPTIONS" :key="option.id" :value="option.id">
                  {{ option.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="flex items-center justify-between gap-3">
            <span class="min-w-0 truncate text-label text-ink">{{ SETTINGS_COPY.sendOnEnter }}</span>
            <Switch
              :model-value="chat.sendOnEnter"
              :aria-label="SETTINGS_COPY.sendOnEnter"
              @update:model-value="setSendOnEnter"
            />
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
