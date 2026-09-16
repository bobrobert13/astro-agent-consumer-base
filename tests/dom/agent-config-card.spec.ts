/**
 * @file tests/dom/agent-config-card.spec.ts
 * @description El formulario de configuración, y la trampa de ADR-002.
 *
 * `useAgentConfig()` devuelve un objeto **plano** con refs dentro. Vue solo
 * desenvuelve los refs de nivel superior del `setup()`, así que un
 * `v-model="config.model"` pasa el `ComputedRef` entero como `modelValue` (de ahí
 * el aviso "Expected String | Number, got Object") y el compilador genera una
 * **asignación a la propiedad del objeto**, que sustituye el computed por el
 * valor tecleado.
 *
 * El daño no es uniforme, y por eso el bug vivió sin que nadie lo notara:
 *
 *  - el `Input` del registry usa `useVModel(…, { passive: true })`, que hace
 *    `ref(props.modelValue)`; al recibir un ref, `ref()` devuelve ese mismo ref,
 *    así que escribir acababa llamando al setter del computed. Funcionaba **por
 *    accidente**;
 *  - el `Switch` de reka solo emite `update:modelValue`, así que la asignación
 *    reemplazaba el computed y el cambio **nunca llegaba a `settings`**: apagar
 *    la memoria no se guardaba.
 *
 * Por eso se prueba el comportamiento además del aviso: el aviso de consola se
 * silencia en cuanto alguien "arregle" el tipo, y el estado sigue desconectado.
 */
import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

import AgentConfigCard from '@domains/agent-config/components/AgentConfigCard.vue';

const SETTINGS = { model: 'modelo-inicial', temperature: 0.5, memoryEnabled: true };

/** Último doble instalado, para poder inspeccionar sus llamadas sin castings. */
let configFetch: ReturnType<typeof stubConfigApi> | undefined;

/**
 * El BFF de config responde el DTO propio; se simula para no levantar Astro.
 *
 * El doble declara y **usa** sus parámetros: sin firma, `mock.calls` queda como
 * tupla vacía y no se puede leer la URL ni el `init` de la llamada —que es lo que
 * comprueban los tests de guardado—. Además solo atiende la ruta de config (otra
 * ruta sería un fallo del test, no del componente) y el `PUT` devuelve eco de lo
 * recibido, como el de verdad.
 */
function stubConfigApi() {
  const mock = vi.fn(async (url: string, init?: RequestInit) => {
    if (!url.includes('/config')) return new Response('{}', { status: 404 });

    const method = init?.method ?? 'GET';
    const echoed: unknown =
      method === 'PUT' && typeof init?.body === 'string' ? (JSON.parse(init.body) as unknown) : SETTINGS;

    return new Response(JSON.stringify({ ok: true, data: echoed }), {
      headers: { 'content-type': 'application/json' },
    });
  });
  vi.stubGlobal('fetch', mock);
  configFetch = mock;
  return mock;
}

/** `[url, init]`, tal y como los tipa el doble (el `init` es opcional en un GET). */
type FetchCall = [url: string, init?: RequestInit | undefined];

/** La llamada de guardado, ya tipada, o `undefined` si no se llegó a hacer. */
function putCall(): FetchCall | undefined {
  return configFetch?.mock.calls.find(([, init]) => init?.method === 'PUT');
}

async function mountCard() {
  stubConfigApi();
  const wrapper = mount(AgentConfigCard, { props: { agents: [] } });
  await flushPromises();
  return wrapper;
}

function buttonByText(wrapper: ReturnType<typeof mount>, text: string) {
  const found = wrapper.findAll('button').find((button) => button.text() === text);
  if (found === undefined) throw new Error(`No hay botón "${text}"`);
  return found;
}

afterEach(() => {
  vi.unstubAllGlobals();
  configFetch = undefined;
});

describe('AgentConfigCard', () => {
  it('con la config resuelta en el servidor no pide nada y nace utilizable', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const wrapper = mount(AgentConfigCard, {
      props: { agents: [], initialAgentId: 'research-agent', initialSettings: SETTINGS },
    });
    await flushPromises();

    // El punto de la optimización: la config viaja como prop, así que no hay
    // `GET` al hidratar y los controles no pasan por el estado deshabilitado.
    expect(fetchMock).not.toHaveBeenCalled();
    expect((wrapper.get('#model').element as HTMLInputElement).value).toBe(SETTINGS.model);
    expect((wrapper.get('#model').element as HTMLInputElement).disabled).toBe(false);
    expect(buttonByText(wrapper, 'Guardar').attributes('disabled')).toBeDefined(); // sin cambios: nada que guardar
    expect(wrapper.text()).toContain('sincronizado');

    wrapper.unmount();
  });

  it('sin config en el servidor la pide al montar, como antes', async () => {
    const fetchMock = stubConfigApi();

    const wrapper = mount(AgentConfigCard, { props: { agents: [] } });
    await flushPromises();

    expect(fetchMock).toHaveBeenCalled();
    expect((wrapper.get('#model').element as HTMLInputElement).value).toBe(SETTINGS.model);

    wrapper.unmount();
  });

  it('guarda contra el agente que le pasa la página, no contra el de por defecto', async () => {
    stubConfigApi();

    const wrapper = mount(AgentConfigCard, {
      props: {
        agents: [{ id: 'otro-agente', name: 'Otro' }],
        initialAgentId: 'otro-agente',
        initialSettings: SETTINGS,
      },
    });
    await flushPromises();

    await wrapper.get('#model').setValue('modelo-nuevo');
    await flushPromises();
    await buttonByText(wrapper, 'Guardar').trigger('click');
    await flushPromises();

    // La ruta lleva el id del agente, así que es donde se ve si el prop llegó al
    // composable. Sin esto, la config se guardaría contra 'research-agent' y el
    // bug pasaría inadvertido mientras el catálogo tenga un solo agente.
    expect(String(putCall()?.[0])).toContain('otro-agente');

    wrapper.unmount();
  });

  it('no pasa objetos a los props tipados de los controles', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const wrapper = await mountCard();

    // El aviso de Vue era el síntoma visible; se deja como aserción para que el
    // síntoma no vuelva por otra vía (Slider o Switch).
    const invalidProps = warn.mock.calls.map((call) => String(call[0])).filter((text) => text.includes('Invalid prop'));
    expect(invalidProps).toEqual([]);

    warn.mockRestore();
    wrapper.unmount();
  });

  it('escribir el modelo marca el formulario como sucio', async () => {
    const wrapper = await mountCard();

    expect(buttonByText(wrapper, 'Guardar').attributes('disabled')).toBeDefined();

    await wrapper.get('#model').setValue('modelo-nuevo');
    await flushPromises();

    // Este campo ya se comportaba bien por el camino de `useVModel` (ver la
    // cabecera): lo que se fija aquí es el contrato del formulario, no la
    // regresión. El discriminador del bug es el `Switch`.
    expect(buttonByText(wrapper, 'Guardar').attributes('disabled')).toBeUndefined();

    wrapper.unmount();
  });

  it('apagar la memoria marca el formulario como sucio', async () => {
    const wrapper = await mountCard();

    const memory = wrapper.get('#memory');
    await memory.trigger('click');
    await flushPromises();

    // Con el `v-model` mal cableado el toggle no llegaba a `settings`: el botón
    // de guardar seguía deshabilitado y el cambio se perdía en silencio.
    expect(buttonByText(wrapper, 'Guardar').attributes('disabled')).toBeUndefined();

    wrapper.unmount();
  });

  it('guardar envía lo editado, no los valores de la carga', async () => {
    const wrapper = await mountCard();

    await wrapper.get('#model').setValue('modelo-nuevo');
    await flushPromises();
    await buttonByText(wrapper, 'Guardar').trigger('click');
    await flushPromises();

    const put = putCall();
    expect(put).toBeDefined();
    expect(String(put?.[1]?.body)).toContain('modelo-nuevo');

    wrapper.unmount();
  });
});
