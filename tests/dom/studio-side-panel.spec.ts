/**
 * @file tests/dom/studio-side-panel.spec.ts
 * @description El panel lateral del estudio: la geometría del cajón y qué espacio
 * enseña.
 *
 * Aquí vive lo que **no** es de ningún espacio concreto, porque vive en un solo
 * sitio: el cierre con transform y margen negativo, el `inert` cuando está cerrado y
 * la decisión de qué contenido se monta. Los contenidos se prueban en sus propios
 * specs (`connectors-panel.spec.ts`), que es la ventaja de haber separado el cajón
 * del contenido: se pueden probar por separado.
 */
import { createPinia } from 'pinia';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import StudioSidePanel from '@domains/chat-studio/components/StudioSidePanel.vue';
import { CONNECTORS, TEMPLATES } from '@domains/connectors/data/connectors.seed';
import { SETTINGS_COPY } from '@domains/settings/data/settings.seed';
import type { PanelScope } from '@domains/chat-studio/types/studio.types';
import type { ConnectorTab } from '@domains/connectors';

/**
 * Con `createPinia` porque el espacio de configuración lee el tema del store global:
 * es el mismo trato que recibe dentro del estudio, donde la app ya la tiene montada.
 */
function mountPanel(panel: PanelScope | null, tab: ConnectorTab = 'fuentes') {
  return mount(StudioSidePanel, {
    props: { panel, connectorsTab: tab },
    global: { plugins: [createPinia()] },
  });
}

describe('StudioSidePanel', () => {
  it('cerrado sale de pantalla y deja de ser alcanzable', () => {
    const closed = mountPanel(null);
    const aside = closed.get('aside');

    // Fuera de pantalla no debe poder recorrerse con el teclado: sin `inert`, sus
    // botones siguen siendo enfocables aunque no se vean.
    expect(aside.attributes('inert')).toBeDefined();
    expect(aside.classes()).toContain('translate-x-full');

    const open = mountPanel('conectores');
    expect(open.get('aside').attributes('inert')).toBeUndefined();
    expect(open.get('aside').classes()).toContain('translate-x-0');
  });

  it('cerrado no monta ningún espacio', () => {
    const wrapper = mountPanel(null);

    // Montar el contenido cerrado sería pagar por lo que no se ve… y peor: sus
    // modales y su botón de cerrar estarían en el DOM, alcanzables.
    expect(wrapper.text()).toBe('');
  });

  it('abre el espacio que le dice el estudio, en su sección', () => {
    const sources = mountPanel('conectores');
    expect(sources.text()).toContain('Conectores');
    expect(sources.text()).toContain(`${CONNECTORS.length} fuentes`);

    // La sección la recuerda el estudio y llega por prop: el panel no adivina.
    const templates = mountPanel('conectores', 'plantillas');
    expect(templates.text()).toContain('Plantillas');
    expect(templates.text()).toContain(`${TEMPLATES.length} plantillas`);
  });

  it('la densidad compacta vive en el cajón, no en cada espacio', () => {
    const wrapper = mountPanel('conectores');

    // Es lo que permite que un espacio nuevo herede la densidad sin repetirla.
    expect(wrapper.get('aside').attributes('data-density')).toBe('compact');
  });

  it('el espacio de configuración ocupa el mismo cajón', () => {
    const wrapper = mountPanel('configuracion');

    // Mismo cajón, otro contenido: ni las pestañas de conectores ni su listado.
    expect(wrapper.text()).toContain(SETTINGS_COPY.title);
    expect(wrapper.text()).toContain(SETTINGS_COPY.appearance);
    expect(wrapper.findAll('[role="tab"]')).toHaveLength(0);
    expect(wrapper.text()).not.toContain('fuentes');
  });

  it('cerrar y cambiar de sección los decide el estudio', async () => {
    const wrapper = mountPanel('conectores');

    await wrapper.findAll('button').find((node) => node.attributes('aria-label') === 'Base de conocimiento')?.trigger('mousedown', {
      button: 0,
      ctrlKey: false,
    });
    expect(wrapper.emitted('update:connectors-tab')?.[0]).toEqual(['conocimiento']);

    await wrapper.findAll('button').find((node) => node.attributes('aria-label') === 'Cerrar conectores')?.trigger('click');
    expect(wrapper.emitted('close')).toHaveLength(1);
  });
});
