/**
 * @file tests/dom/connectors-view.spec.ts
 * @description La vista de conectores: pestañas, catálogo, detalle y la regla de
 * que editar no es guardar.
 *
 * Dos niveles, porque son dos cosas distintas:
 *
 *  - La **vista montada**, que fija lo que se ve y lo que hace un clic: qué
 *    pestaña abre, cuántas tarjetas salen, cómo se comporta el filtro y qué pasa
 *    cuando la búsqueda no encuentra nada.
 *  - El **shell por su arnés**, que fija lo que un clic no alcanza: `Configurar`
 *    trabaja sobre un borrador clonado y solo `Guardar` escribe en el catálogo. Sin
 *    esa separación, cerrar el modal con la cruz dejaría los cambios puestos, y ese
 *    es el fallo que no se ve hasta que alguien cancela y recarga.
 *
 * El `Dialog` del registry se teletransporta a `document.body` y en jsdom no
 * completa su animación de salida, así que el ciclo abrir → cerrar del componente
 * de reka-ui no se prueba aquí —el mismo trato que el modal del estudio—. Lo que sí
 * se prueba es nuestro cableado: que el modal aparezca con el conector que se pulsó
 * y que su contenido salga del borrador.
 */
import { createPinia } from 'pinia';
import { defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import ConnectorsView from '@domains/connectors/views/ConnectorsView.vue';
import SourceCard from '@domains/connectors/views/sources/SourceCard.vue';
import { CONNECTORS, KNOWLEDGE_BASES, TEMPLATES } from '@domains/connectors/data/connectors.seed';
import { provideConnectors, type ConnectorsShell } from '@domains/connectors/composables/useConnectors';
import type { ConnectorTab } from '@domains/connectors';

/** Primera entrada de una semilla, sin indexar a ciegas. */
function first<T>(list: T[]): T {
  const [entry] = list;
  if (entry === undefined) throw new Error('la semilla quedó vacía y el test la da por hecha');
  return entry;
}

function mountView(tab?: ConnectorTab) {
  return mount(ConnectorsView, {
    props: tab === undefined ? { volver: '/chat/ejemplo' } : { tab, volver: '/chat/ejemplo' },
    global: { plugins: [createPinia()] },
  });
}

/** Un clic por texto de botón; los del registry no exponen otra cosa útil. */
function buttonWith(wrapper: ReturnType<typeof mountView>, label: string) {
  return wrapper.findAll('button').find((node) => node.text().includes(label));
}

/** El conector del catálogo por id: es lo que el detalle y el borrador consultan. */
function byId(shell: ConnectorsShell, id: string) {
  return shell.connectors.value.find((entry) => entry.id === id);
}

/** El arnés hace el `provide` y devuelve el mismo objeto que ven los descendientes. */
function mountShell(): ConnectorsShell {
  let provided: ConnectorsShell | undefined;

  const Root = defineComponent({
    name: 'ConnectorsShellHarness',
    setup() {
      provided = provideConnectors();
      return () => h('div');
    },
  });

  mount(Root, { global: { plugins: [createPinia()] } });
  if (provided === undefined) throw new Error('el arnés no proveyó el shell');
  return provided;
}

describe('ConnectorsView', () => {
  it('abre en fuentes, con las tres pestañas y su contador', () => {
    const wrapper = mountView();
    const tabs = wrapper.findAll('[role="tab"]');

    expect(tabs).toHaveLength(3);
    expect(tabs[0]?.text()).toContain('Conectores');
    expect(tabs[0]?.text()).toContain(String(CONNECTORS.length));
    expect(tabs[1]?.text()).toContain('Base de conocimiento');
    expect(tabs[1]?.text()).toContain(String(KNOWLEDGE_BASES.length));
    expect(tabs[2]?.text()).toContain('Plantillas');
    expect(tabs[2]?.text()).toContain(String(TEMPLATES.length));
  });

  it('arranca en la pestaña que trae la URL', () => {
    const wrapper = mountView('conocimiento');

    // La prop viene del `?pestana=`, resuelto en el servidor: si no mandara, esta
    // vista abriría siempre en "Conectores" y saltaría después.
    expect(wrapper.text()).toContain(first(KNOWLEDGE_BASES).name);
    expect(wrapper.findAllComponents(SourceCard)).toHaveLength(0);
  });

  it('pinta una tarjeta por conector de la semilla', () => {
    const wrapper = mountView();

    expect(wrapper.findAllComponents(SourceCard)).toHaveLength(CONNECTORS.length);
  });

  it('el filtro de estado acota la lista sin tocar el contador de la pestaña', async () => {
    const wrapper = mountView();

    await buttonWith(wrapper, 'Con error')?.trigger('click');

    // El contador de la pestaña es el catálogo entero; el filtro acota el listado.
    expect(wrapper.findAllComponents(SourceCard)).toHaveLength(1);
    expect(wrapper.findAll('[role="tab"]')[0]?.text()).toContain(String(CONNECTORS.length));
  });

  it('sin coincidencias enseña el vacío y su botón devuelve el catálogo', async () => {
    const wrapper = mountView();

    await wrapper.get('input[type="search"]').setValue('zzz-no-existe');

    expect(wrapper.findAllComponents(SourceCard)).toHaveLength(0);
    expect(wrapper.text()).toContain('Ningún conector coincide');

    await buttonWith(wrapper, 'Quitar filtros')?.trigger('click');

    expect(wrapper.findAllComponents(SourceCard)).toHaveLength(CONNECTORS.length);
  });

  it('el detalle sustituye al listado y sabe volver', async () => {
    const wrapper = mountView();
    const connector = first(CONNECTORS);

    await buttonWith(wrapper, 'Ver detalle')?.trigger('click');

    expect(wrapper.findAllComponents(SourceCard)).toHaveLength(0);
    expect(wrapper.text()).toContain(connector.name);
    expect(wrapper.text()).toContain('Permisos');

    await buttonWith(wrapper, 'Volver al listado')?.trigger('click');

    expect(wrapper.findAllComponents(SourceCard)).toHaveLength(CONNECTORS.length);
  });

  it('configurar abre el modal con el conector pulsado', async () => {
    const wrapper = mountView();
    const connector = first(CONNECTORS);
    const before = document.querySelectorAll('[role="dialog"]').length;

    await buttonWith(wrapper, 'Configurar')?.trigger('click');

    // La capa del registry se teletransporta a `document.body`.
    await vi.waitFor(() => expect(document.querySelectorAll('[role="dialog"]').length).toBeGreaterThan(before), {
      timeout: 3_000,
      interval: 20,
    });

    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog?.textContent).toContain(connector.name);
    // Los campos salen del borrador, así que el primero de la semilla está ahí.
    expect(dialog?.textContent).toContain(first(connector.fields).label);
  });
});

describe('useConnectors — borrador y catálogo', () => {
  it('cambiar el borrador no toca el catálogo; guardar sí', () => {
    const shell = mountShell();
    const connector = first(CONNECTORS);

    shell.openConfig(connector);
    const draft = shell.editing.value;
    expect(draft).not.toBeNull();
    // Es una copia: si fuera el mismo objeto, editar sería guardar en silencio.
    expect(draft).not.toBe(connector);

    if (draft !== null) draft.name = 'Nombre editado';

    expect(byId(shell, connector.id)?.name).toBe(connector.name);

    shell.saveConfig();

    expect(shell.editing.value).toBeNull();
    expect(byId(shell, connector.id)?.name).toBe('Nombre editado');
  });

  it('cerrar el modal descarta el borrador', () => {
    const shell = mountShell();
    const connector = first(CONNECTORS);

    shell.openConfig(connector);
    if (shell.editing.value !== null) shell.editing.value.name = 'Nombre que no debe quedar';
    shell.closeConfig();

    expect(shell.editing.value).toBeNull();
    expect(byId(shell, connector.id)?.name).toBe(connector.name);
  });

  it('el detalle sigue al catálogo por id, también después de guardar', () => {
    const shell = mountShell();
    const connector = first(CONNECTORS);

    shell.openDetail(connector.id);
    expect(shell.detail.value?.name).toBe(connector.name);

    shell.openConfig(connector);
    if (shell.editing.value !== null) shell.editing.value.name = 'Renombrado';
    shell.saveConfig();

    // Si el detalle guardara el objeto y no el id, aquí seguiría enseñando el
    // nombre viejo, que es el estado huérfano que nadie ve venir.
    expect(shell.detail.value?.name).toBe('Renombrado');
    shell.closeDetail();
    expect(shell.detail.value).toBeNull();
  });

  it('la búsqueda mira nombre y proveedor, y el vacío se puede deshacer', () => {
    const shell = mountShell();

    shell.setQuery('proveedor de datos');
    expect(shell.visible.value).toHaveLength(1);

    shell.setFilter('error');
    expect(shell.visible.value).toHaveLength(0);
    expect(shell.troubled.value).toBeGreaterThan(0);

    shell.clearFilters();
    expect(shell.visible.value).toHaveLength(CONNECTORS.length);
    expect(shell.filter.value).toBe('all');
  });
});
