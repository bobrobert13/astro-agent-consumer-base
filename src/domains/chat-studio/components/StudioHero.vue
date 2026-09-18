<script setup lang="ts">
/**
 * @file src/domains/chat-studio/components/StudioHero.vue
 * @description Bloque de marca del estado vacío: el hueco del logotipo, el eslogan
 * y el titular.
 *
 * **Sin la píldora de planes**: prometía una ampliación que no existe —y que además
 * no es asunto de este esqueleto— y metía un botón de compra por encima de lo que sí
 * importa, que es empezar a escribir. En su sitio va un eslogan corto, debajo del
 * logotipo y en tamaño pequeño: da tono sin competir con el titular.
 *
 * El `<h1>` se queda como está a propósito: es la pregunta que orienta el estado
 * vacío, y el eslogan es adorno. Un adorno que se lee primero dejaría de serlo.
 *
 * No incluye el composer: el de la plantilla vive aquí dentro, pero en cuanto hay
 * conversación tiene que quedarse abajo, así que la caja de escritura la coloca
 * `StudioPanel` en uno de los dos sitios. Así hay **una sola** instancia del
 * composer en el DOM y el `id="aac-composer"` nunca está duplicado.
 */
import StudioImageSlot from './StudioImageSlot.vue';
import { STUDIO_COPY, STUDIO_IMAGE_SLOTS } from '../data/studio.seed';
</script>

<template>
  <div class="flex w-full flex-col items-center">
    <StudioImageSlot :name="STUDIO_IMAGE_SLOTS.hero" class="h-15 w-15 rounded-panel bg-elevated" />

    <!-- `text-balance` parte el eslogan en dos líneas equilibradas en móvil; a
         partir de ahí cabe en una y no cambia nada. -->
    <p class="mt-3 text-center text-label text-balance text-ink-muted">{{ STUDIO_COPY.heroSlogan }}</p>

    <h1 class="mt-6 text-center text-hero">{{ STUDIO_COPY.heroTitle }}</h1>
  </div>
</template>
