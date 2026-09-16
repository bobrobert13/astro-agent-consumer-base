<script setup lang="ts">
/**
 * @file src/domains/app-shell/components/NavigationProgress.vue
 * @description Barra de progreso de navegación del shell.
 *
 * Existe porque con `ClientRouter` las rutas se cambian por JS: entre el clic y el
 * HTML nuevo no pasa nada visible, y ese silencio se lee como "la app se ha
 * quedado parada" — más aún en páginas que resuelven datos en el servidor
 * (`/settings` pide catálogo y config antes de responder).
 *
 * Se dibuja con el `Progress` del registry (reka-ui) en vez de inventar un div con
 * colores: así el color y el radio salen de los tokens y el indicador es el mismo
 * que en cualquier otro progreso del producto. Va a 2 px y solo se ve el
 * indicador, que es lo que lo hace discreto.
 *
 * **Aria oculto a propósito**: la barra aparece y desaparece en cada navegación, y
 * un `role="progressbar"` que se anuncia cada vez es ruido para quien usa lector
 * de pantalla. El cambio de página ya se anuncia solo.
 */
import { onMounted, onScopeDispose, ref } from 'vue';

import { Progress } from '@/components/ui/progress';

/** Arranque, techo del avance "a ciegas" y cadencia de la animación. */
const START = 10;
const CEILING = 88;
const CREEP_MS = 220;

/**
 * Si la navegación se cancela (otro listener llama a `preventDefault()`, o el
 * `fetch` del HTML falla), `astro:page-load` no llega nunca. Sin esta red, la
 * barra se quedaría avanzando sola para siempre.
 */
const SAFETY_MS = 8_000;
const FADE_MS = 260;

/** Eventos del `ClientRouter`; se despachan sobre `document`. */
const NAV_START = 'astro:before-preparation';
const NAV_END = 'astro:page-load';

const value = ref(0);
const visible = ref(false);

let creep: ReturnType<typeof setInterval> | undefined;
let safety: ReturnType<typeof setTimeout> | undefined;
let fade: ReturnType<typeof setTimeout> | undefined;

function stopTimers(): void {
  clearInterval(creep);
  clearTimeout(safety);
  clearTimeout(fade);
  creep = undefined;
  safety = undefined;
  fade = undefined;
}

function start(): void {
  stopTimers();
  visible.value = true;
  value.value = START;

  creep = setInterval(() => {
    // Avance proporcional al hueco que queda, con un mínimo de 1: sin el mínimo,
    // el redondeo congelaría la barra cerca del techo. Nunca llega al 100 % por su
    // cuenta — eso lo marca el fin real de la navegación.
    value.value = Math.min(CEILING, value.value + Math.max(1, Math.round((CEILING - value.value) * 0.12)));
  }, CREEP_MS);

  safety = setTimeout(finish, SAFETY_MS);
}

function finish(): void {
  if (!visible.value) return;
  stopTimers();
  value.value = 100;
  fade = setTimeout(() => {
    visible.value = false;
    // A 0 el indicador mide 0, así que el desvanecido no deja un trozo pintado.
    value.value = 0;
  }, FADE_MS);
}

onMounted(() => {
  document.addEventListener(NAV_START, start);
  document.addEventListener(NAV_END, finish);
});

onScopeDispose(() => {
  document.removeEventListener(NAV_START, start);
  document.removeEventListener(NAV_END, finish);
  stopTimers();
});
</script>

<template>
  <div
    class="pointer-events-none fixed inset-x-0 top-0 z-50 transition-opacity duration-200"
    :class="visible ? 'opacity-100' : 'opacity-0'"
    aria-hidden="true"
  >
    <!--
      El `Progress` del registry trae pista (`bg-primary/20`), radio y `h-2`; aquí
      se neutralizan los tres para dejar solo el indicador de marca.
    -->
    <Progress :model-value="value" class="h-0.5 rounded-none bg-transparent" />
  </div>
</template>
