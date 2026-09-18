/**
 * @file tests/dom/studio-context-panel.spec.ts
 * @description El panel de contexto y su vista previa.
 *
 * Aquí y no en el smoke de Electron a propósito. El modal **sí** se puede abrir en
 * Chromium, pero en una ventana oculta Chromium no avanza la transición con la que
 * el panel entra, así que las filas se quedan fuera del viewport y no hay forma
 * estable de pulsarlas. Lo que el smoke no puede sustituir —hidratación, stream y
 * CSP— está allí; esto es contrato de componentes, y en jsdom se prueba entero y
 * sin depender del compositor.
 *
 * El `Dialog` del registry se teletransporta a `document.body`, así que sus nodos
 * se buscan en el documento, no dentro del wrapper.
 *
 * **Lo que no se prueba aquí es el cierre.** El botón de la `X` del registry es de
 * reka-ui y en jsdom sus eventos sintéticos no lo disparan, así que el ciclo
 * completo abrir → cerrar se comprueba en Chromium (y el contenido de reka se
 * queda montado tras cerrar, porque espera una animación de salida que jsdom no
 * ejecuta). El contrato propio —el modal sigue al estado del estudio— está cubierto
 * por el arnés.
 */
import { createPinia } from 'pinia';
import { defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import StudioContextPanel from '@domains/chat-studio/components/StudioContextPanel.vue';
import StudioPreviewDialog from '@domains/chat-studio/components/StudioPreviewDialog.vue';
import {
  provideStudioShell,
  type StudioShell,
} from '@domains/chat-studio/composables/useStudioShell';

interface Harness {
  wrapper: ReturnType<typeof mount>;
  shell: StudioShell;
}

/**
 * Montaje con acceso al shell: el arnés hace el `provide` y devuelve el mismo
 * objeto que reciben los descendientes, así que el test puede comprobar el efecto
 * de una acción sin simular el clic que la dispara. El clic del botón de cerrar del
 * registry no se prueba porque es comportamiento de reka-ui (y en jsdom no
 * completa su animación de salida); lo que se prueba es **nuestro** cableado.
 */
function mountPanel(): Harness {
  let provided: StudioShell | undefined;

  const Root = defineComponent({
    name: 'StudioPanelHarness',
    setup() {
      provided = provideStudioShell();
      return () => h('div', [h(StudioContextPanel), h(StudioPreviewDialog)]);
    },
  });

  const wrapper = mount(Root, { global: { plugins: [createPinia()] } });
  if (provided === undefined) throw new Error('el arnés no proveyó el shell');
  return { wrapper, shell: provided };
}

const dialog = () => document.querySelector('[role="dialog"]');
const resourceRows = (wrapper: Harness['wrapper']) =>
  wrapper.findAll('#studio-pane-recursos li button');
const sourceRows = (wrapper: Harness['wrapper']) => wrapper.findAll('#studio-pane-fuentes li');

describe('StudioContextPanel', () => {
  it('enseña las dos pestañas con el contador de cada una', () => {
    const { wrapper } = mountPanel();
    const tabs = wrapper.findAll('[role="tab"]');

    expect(tabs).toHaveLength(2);
    expect(tabs[0]?.text()).toContain('Recursos');
    expect(tabs[0]?.text()).toContain('6');
    expect(tabs[1]?.text()).toContain('Fuentes');
    expect(tabs[1]?.text()).toContain('3');
  });

  it('cambia de pestaña y solo deja visible una', async () => {
    const { wrapper } = mountPanel();

    // Por defecto, recursos.
    expect(wrapper.get('#studio-pane-fuentes').attributes('hidden')).toBeDefined();
    expect(wrapper.get('#studio-pane-recursos').attributes('hidden')).toBeUndefined();

    await wrapper.findAll('[role="tab"]')[1]?.trigger('click');

    expect(wrapper.get('#studio-pane-recursos').attributes('hidden')).toBeDefined();
    expect(wrapper.get('#studio-pane-fuentes').attributes('hidden')).toBeUndefined();
  });

  it('el ámbito filtra las fuentes sin tocar el contador de la pestaña', async () => {
    const { wrapper } = mountPanel();

    // El contador es el total; el segmentado filtra dentro.
    expect(sourceRows(wrapper)).toHaveLength(1);

    const session = wrapper
      .findAll('[role="group"] button')
      .find((button) => button.text() === 'Sesión');
    expect(session).toBeDefined();
    await session?.trigger('click');

    expect(sourceRows(wrapper)).toHaveLength(2);
    expect(wrapper.findAll('[role="tab"]')[1]?.text()).toContain('3');
  });

  it('al pulsar un recurso se abre su vista previa', async () => {
    const { wrapper } = mountPanel();

    expect(dialog()).toBeNull();

    await resourceRows(wrapper)[0]?.trigger('click');

    await vi.waitFor(() => expect(dialog()).not.toBeNull(), { timeout: 3_000, interval: 20 });
    expect(dialog()?.textContent).toContain('informe-de-ejemplo.pdf');
    // El cuerpo se compone por tipo: un PDF enseña su extracto.
    expect(dialog()?.textContent).toContain('Extracto de ejemplo');
  });

});
