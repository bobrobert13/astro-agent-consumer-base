/**
 * @file tests/dom/settings-panel.spec.ts
 * @description El panel de configuración: el tema (de verdad) y las preferencias de
 * ejemplo.
 *
 * Lo que se prueba aquí es la frontera entre lo real y lo simulado, que es lo que
 * hace honesto este panel: el tema escribe en el store global y toca la clase del
 * documento —o sea, se ve—, y las tres preferencias de chat se quedan en su
 * borrador, con el aviso de que no llegan a la conversación. Un panel que dijera
 * "guardado" para las dos cosas sería peor que no tenerlo.
 *
 * Los dos selectores de agente y modelo **no** se accionan aquí: son de reka-ui y en
 * jsdom no responden a eventos sintéticos (el mismo trato que el resto de sus capas).
 * Su cableado se comprueba por el composable, que es donde vive el estado.
 */
import { createPinia, setActivePinia } from 'pinia';
import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it } from 'vitest';

import SettingsPanel from '@domains/settings/views/SettingsPanel.vue';
import { AGENT_OPTIONS, MODEL_OPTIONS, SETTINGS_COPY } from '@domains/settings/data/settings.seed';
import { useSettings } from '@domains/settings/composables/useSettings';
import { DEFAULT_AGENT_ID } from '@config/app';
import { useAppShellStore } from '@stores/app-shell';

function mountPanel() {
  const pinia = createPinia();
  setActivePinia(pinia);
  return mount(SettingsPanel, { global: { plugins: [pinia] } });
}

/** Un clic por texto: los controles propios son botones, y no hay otra forma. */
function buttonWith(wrapper: ReturnType<typeof mountPanel>, label: string) {
  return wrapper.findAll('button').find((node) => node.text().includes(label));
}

beforeEach(() => {
  setActivePinia(createPinia());
});

describe('SettingsPanel', () => {
  it('el tema se aplica al instante, y de verdad', async () => {
    const wrapper = mountPanel();
    const store = useAppShellStore();

    expect(store.theme).toBe('system');

    await buttonWith(wrapper, 'Oscuro')?.trigger('click');

    expect(store.theme).toBe('dark');
    // El store toca la clase del documento: es lo que lee el CSS, así que esto es
    // lo que separa "guarda la preferencia" de "se ve el cambio".
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    await buttonWith(wrapper, 'Claro')?.trigger('click');

    expect(store.theme).toBe('light');
    expect(document.documentElement.classList.contains('light')).toBe(true);
  });

  it('dice en la primera línea qué es real y qué es de ejemplo', () => {
    const wrapper = mountPanel();

    expect(wrapper.text()).toContain(SETTINGS_COPY.note);
    expect(buttonWith(wrapper, 'Sistema')).toBeDefined();
  });

  it('las preferencias de ejemplo parten del estado real del chat', () => {
    mountPanel();
    const { chat } = useSettings();

    // Si estos valores no coincidieran con cómo arranca el chat, el panel estaría
    // mintiendo sobre el punto de partida: el agente es el default del producto y
    // Enter envía porque es lo que hace el composer hoy.
    expect(chat.value.agentId).toBe(DEFAULT_AGENT_ID);
    expect(chat.value.sendOnEnter).toBe(true);

    // Y el agente de partida es uno de los que el selector ofrece.
    expect(AGENT_OPTIONS.map((option) => option.id)).toContain(chat.value.agentId);
    expect(MODEL_OPTIONS.map((option) => option.id)).toContain(chat.value.modelId);
  });

  it('cambiar una preferencia se queda en su borrador', () => {
    // Se monta para que el panel y el composable compartan estado: lo que se cambia
    // aquí es exactamente lo que el panel enseña.
    mountPanel();
    const { chat, setAgent, setModel, setSendOnEnter } = useSettings();

    setAgent('research-agent');
    setModel('pro');
    setSendOnEnter(false);

    expect(chat.value).toEqual({ agentId: 'research-agent', modelId: 'pro', sendOnEnter: false });
  });
});
