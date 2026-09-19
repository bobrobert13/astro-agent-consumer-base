/**
 * @file tests/dom/studio-source-row.spec.ts
 * @description La fila de una fuente del panel de contexto: se despliega en su
 * sitio.
 *
 * Es el contrato que sustituyó al aviso de "no implementado": la fila enseña el
 * resumen, y al pulsarla el detalle se abre **donde está** —sin modal, sin pantalla
 * encima, sin interrumpir—. Se fija lo que se ve y lo que no: en reposo el detalle
 * no está ni en el DOM, así que no hay nada que un lector de pantalla pueda leer de
 * un contenido cerrado.
 */
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import StudioSourceRow from '@domains/chat-studio/components/StudioSourceRow.vue';
import { STUDIO_COPY, STUDIO_SOURCES } from '@domains/chat-studio/data/studio.seed';
import type { SourceRow } from '@domains/chat-studio/types/studio.types';

function first<T>(list: T[]): T {
  const [entry] = list;
  if (entry === undefined) throw new Error('la semilla quedó vacía y el test la da por hecha');
  return entry;
}

function sourceOf(scope: SourceRow['scope']): SourceRow {
  const found = STUDIO_SOURCES.find((source) => source.scope === scope);
  if (found === undefined) throw new Error(`la semilla no tiene ninguna fuente de ámbito ${scope}`);
  return found;
}

const TRIGGER = '[data-slot="collapsible-trigger"]';
const CONTENT = '[data-slot="collapsible-content"]';

function mountRow(source: SourceRow = first(STUDIO_SOURCES)) {
  return mount(StudioSourceRow, { props: { source } });
}

describe('StudioSourceRow', () => {
  it('en reposo enseña el resumen y guarda el detalle fuera del alcance', () => {
    const source = sourceOf('interaction');
    const wrapper = mountRow(source);

    expect(wrapper.text()).toContain(source.title);
    expect(wrapper.text()).toContain(source.domain);
    expect(wrapper.text()).toContain(source.usedAt);
    expect(wrapper.get(TRIGGER).attributes('aria-expanded')).toBe('false');

    // El contenedor existe —reka lo mantiene montado— pero está oculto y **vacío**:
    // es lo que evita que un lector de pantalla lea un desglose que nadie ha abierto,
    // y lo que hace que el desglose no ocupe sitio hasta que se abre.
    const content = wrapper.get(CONTENT);
    expect(content.attributes('hidden')).toBeDefined();
    expect(content.text()).toBe('');
  });

  it('al pulsarla se despliega en su sitio, con el detalle y su ámbito', async () => {
    const source = sourceOf('interaction');
    const wrapper = mountRow(source);

    await wrapper.get(TRIGGER).trigger('click');

    expect(wrapper.get(TRIGGER).attributes('aria-expanded')).toBe('true');

    const content = wrapper.get(CONTENT);
    // La frase entera, que en el resumen va recortada a dos líneas.
    expect(content.text()).toContain(source.snippet);
    expect(content.text()).toContain(source.url);
    // Y qué significa el ámbito, que es la mitad del valor del desglose.
    expect(content.text()).toContain(STUDIO_COPY.sourceScopeInteraction);
  });

  it('el ámbito de sesión se explica distinto', async () => {
    const wrapper = mountRow(sourceOf('session'));

    await wrapper.get(TRIGGER).trigger('click');

    expect(wrapper.get(CONTENT).text()).toContain(STUDIO_COPY.sourceScopeSession);
    expect(wrapper.get(CONTENT).text()).not.toContain(STUDIO_COPY.sourceScopeInteraction);
  });

  it('se puede volver a cerrar', async () => {
    const wrapper = mountRow();

    await wrapper.get(TRIGGER).trigger('click');
    expect(wrapper.get(TRIGGER).attributes('aria-expanded')).toBe('true');

    await wrapper.get(TRIGGER).trigger('click');
    expect(wrapper.get(TRIGGER).attributes('aria-expanded')).toBe('false');
  });
});
