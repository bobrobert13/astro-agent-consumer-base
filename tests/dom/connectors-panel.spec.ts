/**
 * @file tests/dom/connectors-panel.spec.ts
 * @description El panel de conectores: cabecera, secciones, catálogo, detalle y los
 * dos asistentes.
 *
 * Dos niveles, porque son dos cosas distintas:
 *
 *  - El **panel montado**, que fija lo que se ve y lo que hace un clic: en qué
 *    sección abre, cómo conmuta, cómo se comporta el filtro, qué pasa cuando la
 *    búsqueda no encuentra nada y qué abre cada botón.
 *  - El **estado por su arnés**, que fija lo que un clic no alcanza: que
 *    configurar trabaje sobre un borrador y solo guardar escriba, que el detalle
 *    siga al catálogo por id, y que el alta construya la fuente desde la plantilla
 *    de su familia y la deje **sin autorizar**.
 *
 * El `Dialog` del registry se teletransporta a `document.body` y en jsdom no
 * completa su animación de salida, así que el ciclo abrir → cerrar del componente
 * de reka-ui no se prueba aquí —el mismo trato que el modal del estudio—. Lo que sí
 * se prueba es nuestro cableado: que cada modal aparezca con lo que se pulsó.
 */
import { defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import ConnectorsDrawer from '@domains/connectors/views/ConnectorsDrawer.vue';
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

function mountPanel(options: { open?: boolean; tab?: ConnectorTab } = {}) {
  return mount(ConnectorsDrawer, {
    props: { open: options.open ?? true, tab: options.tab ?? 'fuentes' },
  });
}

/** Un clic por texto de botón; los del registry no exponen otra cosa útil. */
function buttonWith(wrapper: ReturnType<typeof mountPanel>, label: string) {
  return wrapper.findAll('button').find((node) => node.text().includes(label));
}

/** Botón de icono: el nombre está en el `aria-label`, no en el texto. */
function buttonNamed(wrapper: ReturnType<typeof mountPanel>, label: string) {
  return wrapper.findAll('button').find((node) => node.attributes('aria-label') === label);
}

/**
 * Las pestañas del registry activan **en `mousedown`**, no en `click`: es la
 * decisión de reka-ui (permite arrastrar sobre las pestañas sin activarlas). En un
 * navegador el clic real lo dispara igual; en jsdom hay que emitir el evento que
 * el componente escucha, o el test comprobaría un contrato que no es el suyo.
 */
async function selectTab(wrapper: ReturnType<typeof mountPanel>, label: string) {
  await buttonNamed(wrapper, label)?.trigger('mousedown', { button: 0, ctrlKey: false });
}

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

  mount(Root);
  if (provided === undefined) throw new Error('el arnés no proveyó el shell');
  return provided;
}

/**
 * El diálogo que contiene ese texto, no "un" diálogo: el registry teletransporta
 * las capas a `document.body` y en jsdom no ejecuta su animación de salida, así que
 * el de un caso anterior puede seguir montado. Buscar por contenido es lo que hace
 * que el test no dependa del orden ni de la limpieza de reka-ui.
 */
function dialogWith(text: string): Element | null {
  return (
    [...document.querySelectorAll('[role="dialog"]')].find((node) => node.textContent?.includes(text)) ?? null
  );
}

describe('ConnectorsDrawer', () => {
  it('la cabecera dice en qué sección estás y cuántas hay', () => {
    const sources = mountPanel();
    expect(sources.text()).toContain('Conectores');
    expect(sources.text()).toContain(`${CONNECTORS.length} fuentes`);

    const templates = mountPanel({ tab: 'plantillas' });
    expect(templates.text()).toContain('Plantillas');
    expect(templates.text()).toContain(`${TEMPLATES.length} plantillas`);
  });

  it('arranca en la sección que le pasa el estudio', () => {
    const wrapper = mountPanel({ tab: 'conocimiento' });

    // La prop la decide quien abre (rail, franja o herramientas); el panel no
    // adivina. Si no llegara, esto abriría siempre en "Conectores".
    expect(wrapper.text()).toContain(first(KNOWLEDGE_BASES).name);
    expect(wrapper.findAllComponents(SourceCard)).toHaveLength(0);
  });

  it('las pestañas conmutan por icono y avisan al estudio', async () => {
    const wrapper = mountPanel();

    await selectTab(wrapper, 'Base de conocimiento');

    expect(wrapper.emitted('update:tab')?.[0]).toEqual(['conocimiento']);
    expect(wrapper.text()).toContain(first(KNOWLEDGE_BASES).name);
  });

  it('el listado sale de la semilla y el filtro lo acota sin tocar el contador', async () => {
    const wrapper = mountPanel();
    expect(wrapper.findAllComponents(SourceCard)).toHaveLength(CONNECTORS.length);

    await buttonWith(wrapper, 'Con error')?.trigger('click');

    expect(wrapper.findAllComponents(SourceCard)).toHaveLength(1);
    // El contador de la cabecera es el catálogo entero; el filtro acota el listado.
    expect(wrapper.text()).toContain(`${CONNECTORS.length} fuentes`);
  });

  it('sin coincidencias enseña el vacío y su botón devuelve el catálogo', async () => {
    const wrapper = mountPanel();

    await wrapper.get('input[type="search"]').setValue('zzz-no-existe');

    expect(wrapper.findAllComponents(SourceCard)).toHaveLength(0);
    expect(wrapper.text()).toContain('Ninguna fuente coincide');

    await buttonWith(wrapper, 'Quitar filtros')?.trigger('click');

    expect(wrapper.findAllComponents(SourceCard)).toHaveLength(CONNECTORS.length);
  });

  it('el detalle sustituye al listado y sabe volver', async () => {
    const wrapper = mountPanel();
    const connector = first(CONNECTORS);

    await buttonWith(wrapper, 'Ver detalle')?.trigger('click');

    expect(wrapper.findAllComponents(SourceCard)).toHaveLength(0);
    expect(wrapper.text()).toContain(connector.name);
    expect(wrapper.text()).toContain('Permisos');

    await buttonWith(wrapper, 'Volver al listado')?.trigger('click');

    expect(wrapper.findAllComponents(SourceCard)).toHaveLength(CONNECTORS.length);
  });

  it('cerrado sale de pantalla y deja de ser alcanzable', () => {
    const closed = mountPanel({ open: false });
    const aside = closed.get('aside');

    // Fuera de pantalla no debe poder recorrerse con el teclado: sin `inert`, sus
    // botones siguen siendo enfocables aunque no se vean.
    expect(aside.attributes('inert')).toBeDefined();
    expect(aside.classes()).toContain('translate-x-full');

    const open = mountPanel();
    expect(open.get('aside').attributes('inert')).toBeUndefined();
    expect(open.get('aside').classes()).toContain('translate-x-0');
  });

  it('el botón de cerrar avisa al estudio', async () => {
    const wrapper = mountPanel();

    await buttonNamed(wrapper, 'Cerrar conectores')?.trigger('click');

    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it('configurar abre el modal con el conector pulsado', async () => {
    const wrapper = mountPanel();
    const connector = first(CONNECTORS);

    await buttonWith(wrapper, 'Configurar')?.trigger('click');

    await vi.waitFor(() => expect(dialogWith(connector.name)).not.toBeNull(), { timeout: 3_000, interval: 20 });

    const dialog = dialogWith(connector.name);
    expect(dialog?.textContent).toContain(first(connector.fields).label);
  });

  it('añadir abre el asistente por el primer paso', async () => {
    const wrapper = mountPanel();

    await buttonNamed(wrapper, 'Añadir conector')?.trigger('click');

    await vi.waitFor(() => expect(dialogWith('Añadir conector')).not.toBeNull(), { timeout: 3_000, interval: 20 });

    const dialog = dialogWith('Añadir conector');
    // El paso 1 es elegir familia, así que las familias están en pantalla.
    expect(dialog?.textContent).toContain('Base de datos');
    expect(dialog?.textContent).toContain('Mensajería');
  });
});

describe('useConnectors — catálogo, detalle y borradores', () => {
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

  it('cambiar de sección cierra el detalle abierto', () => {
    const shell = mountShell();

    shell.openDetail(first(CONNECTORS).id);
    expect(shell.detail.value).not.toBeNull();

    shell.setTab('plantillas');
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

  it('el alta nace de la plantilla de su familia y sin autorizar', () => {
    const shell = mountShell();

    shell.openAdd();
    const database = shell.adding.value;
    expect(database?.kind).toBe('database');
    // Rellenar el formulario no es tener la conexión: nace pendiente de autorizar.
    expect(database?.status).toBe('pending');
    expect(database?.documents).toBe(0);

    // Cambiar de familia reconstruye el borrador: otros campos y otros permisos.
    shell.setAddingKind('docs');
    const docs = shell.adding.value;
    expect(docs?.id).not.toBe(database?.id);
    expect(docs?.kind).toBe('docs');
    expect(docs?.fields).not.toEqual(database?.fields);
  });

  it('el alta entra por delante y deja el panel en la sección de fuentes', () => {
    const shell = mountShell();
    const before = shell.connectors.value.length;

    shell.setTab('plantillas');
    shell.openAdd();
    if (shell.adding.value !== null) shell.adding.value.name = 'Fuente recién creada';
    shell.saveAdd();

    expect(shell.adding.value).toBeNull();
    expect(shell.connectors.value).toHaveLength(before + 1);
    expect(first(shell.connectors.value).name).toBe('Fuente recién creada');
    expect(first(shell.connectors.value).status).toBe('pending');
    // Crear algo que no aparece donde estás mirando se lee como que no se creó.
    expect(shell.tab.value).toBe('fuentes');
  });
});
