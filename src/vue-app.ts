import type { App } from 'vue';
import { PiniaColada } from '@pinia/colada';
import { pinia } from '@stores/pinia';
import { reportError } from '@shared/observability/report-error';

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

  // Sin handler, un error de render en una isla solo sale por el log interno de
  // Vue y se pierde en producción. Por la costura única de reporte: cuando se
  // enchufe un APM, los fallos de componente ya estarán fluyendo por él.
  app.config.errorHandler = (error, _instance, info) => {
    reportError(error, { scope: 'vue/island', tags: { info } });
  };
}
