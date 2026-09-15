import type { App } from 'vue';
import { PiniaColada } from '@pinia/colada';
import { pinia } from '@stores/pinia';

/**
 * `appEntrypoint` de @astrojs/vue (astro.config.mjs).
 *
 * Se ejecuta sobre la `App` de CADA isla antes de `app.mount()`, así que es el
 * único punto donde tiene sentido registrar plugins globales en Astro. Si se
 * añade uno aquí, aplica a todas las islas del proyecto: no hay que repetirlo
 * por componente.
 */
export default function setup(app: App): void {
  app.use(pinia);
  app.use(PiniaColada);
}
