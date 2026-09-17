<script setup lang="ts">
/**
 * @file src/domains/chat-studio/components/StudioImageSlot.vue
 * @description Hueco para una imagen del estudio. Con `src` pinta la imagen y sin
 * él deja el espacio reservado y vacío.
 *
 * Es la respuesta al encargo de "dejar un espacio vacío para colocar imágenes
 * después": la plantilla traía marca propia y aquí no se copia, pero sí su
 * geometría. Para poner la imagen definitiva basta con pasar `src` — no hay que
 * tocar el componente ni buscar el sitio en el maquetado.
 *
 * El tamaño, el radio y el fondo los pone quien lo usa, con utilidades de token:
 * el mismo hueco sirve para la marca del rail, la del estado vacío y un avatar.
 * Del componente solo salen la estructura y el `data-image-slot`, que es lo que
 * permite localizar los huecos que siguen pendientes.
 */
interface Props {
  /** Nombre del hueco; se publica en `data-image-slot`. */
  name: string;
  /** Ruta de la imagen definitiva. Sin ella, el hueco queda vacío. */
  src?: string | undefined;
  /** Texto alternativo. Vacío a propósito cuando la imagen es decorativa. */
  alt?: string | undefined;
}

const props = withDefaults(defineProps<Props>(), { src: undefined, alt: '' });
</script>

<template>
  <span
    :data-image-slot="props.name"
    :aria-hidden="props.src === undefined ? 'true' : undefined"
    class="block shrink-0 overflow-hidden"
  >
    <img v-if="props.src !== undefined" :src="props.src" :alt="props.alt" class="size-full object-cover" />
  </span>
</template>
