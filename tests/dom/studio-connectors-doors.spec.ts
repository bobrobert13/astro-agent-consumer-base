/**
 * @file tests/dom/studio-connectors-doors.spec.ts
 * @description Las puertas del estudio hacia la vista de conectores.
 *
 * Lo que se prueba es la **intención de navegar**, que en jsdom es lo único
 * observable (el doble de `astro:transitions/client` apunta las rutas pedidas). No
 * es un detalle de fontanería: la URL lleva la pestaña, el hilo vivo y el camino de
 * vuelta, y de esas tres cosas depende que el estudio no cambie de hilo al abrir la
 * capa —con una respuesta en curso, eso es cortarla— y que volver regrese al sitio
 * correcto.
 *
 * Las tres secciones del rail se cubren a la vez a propósito: dos tienen destino y
 * "Explorar" no, y una puerta que navegue a ninguna parte sería peor que el aviso
 * que tiene ahora.
 */
import { createPinia } from 'pinia';
import { defineComponent, h, type Component } from 'vue';
import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it } from 'vitest';

import StudioConnectBar from '@domains/chat-studio/components/StudioConnectBar.vue';
import StudioComposer from '@domains/chat-studio/components/StudioComposer.vue';
import StudioNav from '@domains/chat-studio/components/StudioNav.vue';
import { provideStudioShell } from '@domains/chat-studio/composables/useStudioShell';
import { TooltipProvider } from '@components/ui/tooltip';
import { DEFAULT_AGENT_ID } from '@config/app';
import { routes } from '@config/routes';
import { navigations, resetNavigations } from '../_stubs/astro-transitions-client';

beforeEach(() => {
  resetNavigations();
});

/**
 * Monta un componente del estudio con lo que su raíz le da: el shell y el
 * `TooltipProvider` (las herramientas del composer van envueltas en un tooltip, y
 * sin el proveedor reka-ui lanza).
 */
function mountInsideStudio(component: Component) {
  const Root = defineComponent({
    name: 'StudioDoorHarness',
    setup() {
      provideStudioShell();
      return () => h(TooltipProvider, null, { default: () => h(component) });
    },
  });

  return mount(Root, { global: { plugins: [createPinia()] } });
}

/** La ruta que se pidió, con el camino de vuelta que el estudio tenía delante. */
function lastNavigation(): string {
  const target = navigations.at(-1);
  if (target === undefined) throw new Error('no se pidió ninguna navegación');
  return target;
}

describe('puertas hacia la vista de conectores', () => {
  it('la franja del composer abre la pestaña de fuentes con el hilo vivo', async () => {
    // La franja no necesita el shell del estudio: solo el enlace.
    const wrapper = mount(StudioConnectBar, { global: { plugins: [createPinia()] } });

    await wrapper.get('button').trigger('click');

    const expected = routes.connectors({
      tab: 'fuentes',
      hilo: 'nuevo',
      agente: DEFAULT_AGENT_ID,
      volver: `${window.location.pathname}${window.location.search}`,
    });
    expect(lastNavigation()).toBe(expected);
    // Y lo que hace falta que viaje, en claro, para que el test no dependa de un
    // orden concreto de parámetros.
    expect(lastNavigation()).toContain('pestana=fuentes');
    expect(lastNavigation()).toContain('hilo=nuevo');
  });

  it('las secciones del rail abren su pestaña', async () => {
    const wrapper = mountInsideStudio(StudioNav);

    const navButton = (label: string) => wrapper.findAll('button').find((node) => node.text().includes(label));

    await navButton('Base de conocimiento')?.trigger('click');
    expect(lastNavigation()).toContain('pestana=conocimiento');

    await navButton('Plantillas')?.trigger('click');
    expect(lastNavigation()).toContain('pestana=plantillas');
  });

  it('"Explorar" no navega a ninguna parte: avisa', async () => {
    const wrapper = mountInsideStudio(StudioNav);

    await wrapper.findAll('button').find((node) => node.text().includes('Explorar'))?.trigger('click');

    // Sin destino no hay navegación; el aviso lo pone el toast, que es lo que el
    // repositorio pide para una zona de esqueleto.
    expect(navigations).toHaveLength(0);
  });

  it('la herramienta del composer abre lo mismo que la franja', async () => {
    const wrapper = mountInsideStudio(StudioComposer);

    const tool = wrapper.findAll('button').find((node) => node.attributes('aria-label') === 'Conectores externos');
    expect(tool).toBeDefined();

    await tool?.trigger('click');

    expect(lastNavigation()).toContain('pestana=fuentes');
  });
});
