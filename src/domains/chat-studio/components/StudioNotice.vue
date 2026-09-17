<script setup lang="ts">
/**
 * @file src/domains/chat-studio/components/StudioNotice.vue
 * @description Aviso dentro del globo: el backend bloqueó la ejecución.
 *
 * Existe porque el backend cierra la ejecución con la parte `data-tripwire`, y
 * hasta que el adapter la tradujo la UI pintaba un globo **vacío**: la persona
 * escribía y no veía nada, que es peor que un error. Va en su propio bloque y no
 * dentro del markdown a propósito: el bloqueo es el desenlace de la ejecución, no
 * contenido del agente.
 *
 * El detalle solo se pinta si viene; sin él no se deja una línea vacía.
 */
defineProps<{ text: string; detail?: string | undefined }>();
</script>

<template>
  <div class="rounded-panel border border-warning/40 bg-warning/10 px-3 py-2">
    <p class="text-body-sm font-medium text-ink">{{ text }}</p>
    <p v-if="detail !== undefined && detail !== ''" class="mt-1 text-caption text-ink-muted">{{ detail }}</p>
  </div>
</template>
