<script setup lang="ts">
/**
 * @file src/domains/app-shell/components/ShellShortcuts.vue
 * @description Isla sin UI que registra los atajos globales del shell.
 *
 * Existe porque `useShortcuts()` necesita un componente hidratado para vivir:
 * un composable con `document.addEventListener` no puede ejecutarse en el
 * servidor, y /settings anuncia estos atajos como reales. Se monta una sola vez
 * en `AppLayout` con `client:only="vue"` (nunca SSR: toca `document` y el store
 * de Pinia, y un store renderizado en el servidor mezclaría estado entre
 * peticiones).
 */
import { useShortcuts } from '../composables/useShortcuts';

useShortcuts();
</script>

<template>
  <span hidden aria-hidden="true"></span>
</template>
