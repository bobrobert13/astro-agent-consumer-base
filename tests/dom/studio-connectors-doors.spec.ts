/**
 * @file tests/dom/studio-connectors-doors.spec.ts
 * @description Las puertas del estudio hacia el panel de conectores.
 *
 * Ahora lo que se comprueba **no** es una navegación: es el estado del chrome. El
 * panel es una columna del estudio —no otra pantalla—, así que abrirlo no cambia
 * la URL ni desmonta la isla; lo único observable es qué dejó abierto cada botón, y
 * eso es justo lo que hay que fijar: la franja del composer entra por "fuentes", el
 * rail entra por la sección de cada una de sus entradas, y la herramienta del
 * composer entra por donde la franja.
 *
 * Las puertas comparten el mismo estado, así que se prueban contra el mismo arnés:
 * el estudio de verdad (con su `provideStudioShell`) y no una copia.
 */
import { createPinia } from 'pinia';
import { defineComponent, h, type Component } from 'vue';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import StudioComposer from '@domains/chat-studio/components/StudioComposer.vue';
import StudioConnectBar from '@domains/chat-studio/components/StudioConnectBar.vue';
import StudioNav from '@domains/chat-studio/components/StudioNav.vue';
import { provideStudioShell, type StudioShell } from '@domains/chat-studio/composables/useStudioShell';
import { TooltipProvider } from '@components/ui/tooltip';

/**
 * Monta un componente del estudio con lo que su raíz le da: el shell (del que
 * devuelve el mismo objeto, para poder mirarlo) y el `TooltipProvider`, que las
 * herramientas del composer necesitan.
 */
function mountInsideStudio(component: Component) {
  let shell: StudioShell | undefined;

  const Root = defineComponent({
    name: 'StudioDoorHarness',
    setup() {
      shell = provideStudioShell();
      return () => h(TooltipProvider, null, { default: () => h(component) });
    },
  });

  const wrapper = mount(Root, { global: { plugins: [createPinia()] } });
  if (shell === undefined) throw new Error('el arnés no proveyó el shell');
  return { wrapper, shell };
}

describe('puertas hacia el panel de conectores', () => {
  it('la franja del composer lo abre en la sección de fuentes', async () => {
    const { wrapper, shell } = mountInsideStudio(StudioConnectBar);

    expect(shell.connectorsOpen.value).toBe(false);
    await wrapper.get('button').trigger('click');

    expect(shell.connectorsOpen.value).toBe(true);
    expect(shell.connectorsTab.value).toBe('fuentes');
  });

  it('las secciones del rail lo abren en la suya', async () => {
    const { wrapper, shell } = mountInsideStudio(StudioNav);

    const navButton = (label: string) => wrapper.findAll('button').find((node) => node.text().includes(label));

    await navButton('Base de conocimiento')?.trigger('click');
    expect(shell.connectorsOpen.value).toBe(true);
    expect(shell.connectorsTab.value).toBe('conocimiento');

    await navButton('Plantillas')?.trigger('click');
    expect(shell.connectorsTab.value).toBe('plantillas');
  });

  it('todas las secciones del rail tienen destino', async () => {
    const { wrapper, shell } = mountInsideStudio(StudioNav);

    // El rail ya no tiene ninguna sección de esqueleto: si alguien añade una y no
    // le da destino, el mapa exhaustivo de `StudioNav` no compila.
    const sections = wrapper.findAll('button');
    expect(sections.length).toBeGreaterThan(0);

    for (const section of sections) {
      await section.trigger('click');
      expect(shell.connectorsOpen.value).toBe(true);
    }
  });

  it('la herramienta del composer abre lo mismo que la franja', async () => {
    const { wrapper, shell } = mountInsideStudio(StudioComposer);

    const tool = wrapper.findAll('button').find((node) => node.attributes('aria-label') === 'Conectores externos');
    expect(tool).toBeDefined();

    await tool?.trigger('click');

    expect(shell.connectorsOpen.value).toBe(true);
    expect(shell.connectorsTab.value).toBe('fuentes');
  });
});
