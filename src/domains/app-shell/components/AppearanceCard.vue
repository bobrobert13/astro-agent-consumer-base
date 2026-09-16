<script setup lang="ts">
/**
 * @file src/domains/app-shell/components/AppearanceCard.vue
 * @description Preferencias de interfaz: tema y navegación lateral.
 *
 * Escribe en `useAppShellStore`, que es el único sitio que persiste esas dos
 * preferencias. La isla existe porque un `.astro` sin directiva no puede cambiar
 * el tema en caliente: el selector se renderizaría y quedaría mudo.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { Label } from '@components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@components/ui/select';
import { Separator } from '@components/ui/separator';
import { Switch } from '@components/ui/switch';
import { Badge } from '@components/ui/badge';
import { useAppShellStore, type ShellTheme } from '@domains/app-shell';

const shell = useAppShellStore();

const THEMES: Array<{ value: ShellTheme; label: string; hint: string }> = [
  { value: 'system', label: 'Del sistema', hint: 'sigue a prefers-color-scheme' },
  { value: 'light', label: 'Claro', hint: 'forzado' },
  { value: 'dark', label: 'Oscuro', hint: 'forzado' },
];

/**
 * Lo que el usuario ve como "ahora mismo", resolviendo `system`. Se lee del media
 * query en vivo, no se duplica la lógica en el store: el store decide clases,
 * aquí solo se informa.
 */
const prefersDark = ref(false);
let media: MediaQueryList | undefined;

/**
 * Se lee el media query en vivo en vez de duplicar la lógica en el store: el store
 * decide clases en el documento, aquí solo se informa de lo que resulta. El
 * listener se cierra al desmontar, que es lo que evita el leak que delata un
 * `addEventListener` suelto en el cuerpo del componente.
 */
function onThemeChange(event: MediaQueryListEvent): void {
  prefersDark.value = event.matches;
}

onMounted(() => {
  media = window.matchMedia?.('(prefers-color-scheme: dark)');
  if (media === undefined) return;
  prefersDark.value = media.matches;
  media.addEventListener('change', onThemeChange);
});

onBeforeUnmount(() => media?.removeEventListener('change', onThemeChange));

const resolved = computed(() =>
  shell.theme === 'system' ? (prefersDark.value ? 'oscuro' : 'claro') : shell.theme === 'dark' ? 'oscuro' : 'claro'
);

const themeValue = computed({
  get: () => shell.theme,
  set: (value: ShellTheme) => shell.setTheme(value),
});
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>Apariencia</CardTitle>
      <CardDescription>Preferencias guardadas en este dispositivo.</CardDescription>
    </CardHeader>

    <CardContent class="flex flex-col gap-6">
      <div class="flex items-center justify-between gap-4">
        <div class="flex flex-col">
          <Label for="theme">Tema</Label>
          <span class="text-xs text-muted-foreground">
            {{ THEMES.find((item) => item.value === shell.theme)?.hint ?? '' }} · activo: {{ resolved }}
          </span>
        </div>
        <Select id="theme" v-model="themeValue">
          <SelectTrigger class="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="item in THEMES" :key="item.value" :value="item.value">{{ item.label }}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator />

      <div class="flex items-center justify-between gap-4">
        <div class="flex flex-col">
          <Label for="sidebar">Navegación lateral</Label>
          <span class="text-xs text-muted-foreground">En pantallas estrechas se convierte en barra superior.</span>
        </div>
        <Switch id="sidebar" v-model="shell.sidebarOpen" class="shrink-0" />
      </div>

      <div class="flex items-center gap-2 text-xs text-muted-foreground">
        Estado del sidebar:
        <Badge :variant="shell.sidebarOpen ? 'default' : 'secondary'">
          {{ shell.sidebarOpen ? 'abierto' : 'cerrado' }}
        </Badge>
      </div>
    </CardContent>
  </Card>
</template>
