<script setup lang="ts">
/**
 * @file src/domains/chat-studio/components/StudioUserCard.vue
 * @description Tarjeta de usuario del pie del rail, con su menú.
 *
 * El menú es donde ha quedado el **conmutador de tema**: la plantilla no traía
 * ninguno y `/settings` desaparece con el resto de los slices de esqueleto, así que
 * sin esto el modo oscuro quedaría implementado pero inalcanzable. Desde que existe
 * el panel de configuración hay dos sitios para cambiarlo, así que **la lista de
 * temas es una sola** —la del slice de ajustes— y este menú la lee: con dos listas,
 * un tema nuevo aparecería en un sitio y no en el otro.
 *
 * Se usa un grupo de opciones y no un interruptor porque el store distingue tres
 * estados —claro, oscuro y seguir al sistema— y un booleano no puede expresarlos:
 * con el tema en `system` y el sistema en oscuro, un interruptor apagado mentiría.
 */
import { ChevronsUpDown } from '@lucide/vue';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@components/ui/dropdown-menu';
import { THEME_OPTIONS } from '@domains/settings';
import { useAppShellStore } from '@stores/app-shell';
import { STUDIO_USER } from '../data/studio.seed';

const appShell = useAppShellStore();

/** reka-ui entrega el valor sin tipar; se estrecha aquí y no en el store. */
function onTheme(value: unknown): void {
  if (value === 'light' || value === 'dark' || value === 'system') appShell.setTheme(value);
}
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <button
        type="button"
        class="flex h-13 w-full items-center gap-3 rounded-panel border border-line bg-canvas px-3 text-left transition-colors hover:bg-line/60"
      >
        <span
          class="grid size-7 shrink-0 place-items-center rounded-full bg-brand-500 text-caption font-semibold text-on-brand"
        >
          {{ STUDIO_USER.initials }}
        </span>
        <span class="flex min-w-0 flex-col leading-tight">
          <strong class="truncate text-label font-semibold">{{ STUDIO_USER.name }}</strong>
          <small class="truncate">{{ STUDIO_USER.plan }}</small>
        </span>
        <ChevronsUpDown class="ml-auto size-4 shrink-0 text-ink-muted" aria-hidden="true" />
      </button>
    </DropdownMenuTrigger>

    <DropdownMenuContent align="end" class="w-56">
      <DropdownMenuLabel>{{ STUDIO_USER.name }}</DropdownMenuLabel>
      <DropdownMenuSeparator />

      <DropdownMenuRadioGroup :model-value="appShell.theme" @update:model-value="onTheme">
        <DropdownMenuRadioItem v-for="theme in THEME_OPTIONS" :key="theme.id" :value="theme.id">
          <component :is="theme.icon" class="size-4" aria-hidden="true" />
          <span>{{ theme.label }}</span>
        </DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
