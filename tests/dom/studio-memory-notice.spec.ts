/**
 * @file tests/dom/studio-memory-notice.spec.ts
 * @description El aviso de memoria del hilo: aparece solo cuando el backend está a
 * punto de resumir, y cuando aparece dice cuánto.
 *
 * Es el contrato de la vista, no del adapter: la presión la calcula
 * `ai/adapt-ui-messages` y está probada allí. Aquí se fija lo que decide ESTE
 * componente — umbral, texto y que por debajo no ocupe sitio.
 */
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import StudioMemoryNotice from '@domains/chat-studio/components/StudioMemoryNotice.vue';

const notice = (wrapper: ReturnType<typeof mount>) => wrapper.find('[role="status"]');

describe('StudioMemoryNotice', () => {
  it('no pinta nada mientras la memoria va holgada', () => {
    const wrapper = mount(StudioMemoryNotice, { props: { pressure: 0.4 } });

    expect(notice(wrapper).exists()).toBe(false);
    expect(wrapper.text()).toBe('');
  });

  it('tampoco justo por debajo del umbral', () => {
    expect(notice(mount(StudioMemoryNotice, { props: { pressure: 0.79 } })).exists()).toBe(false);
  });

  it('avisa desde el umbral, con el porcentaje redondeado', () => {
    const wrapper = mount(StudioMemoryNotice, { props: { pressure: 0.8 } });

    expect(notice(wrapper).exists()).toBe(true);
    expect(wrapper.text()).toContain('80 %');
    expect(wrapper.text()).toContain('resumirá el historial');
  });

  it('una memoria llena al 96 % se anuncia como tal', () => {
    expect(mount(StudioMemoryNotice, { props: { pressure: 0.96 } }).text()).toContain('96 %');
  });

  it('es una región `polite`, no una alerta que interrumpe', () => {
    // El aviso convive con un stream en marcha: como región *assertive* cortaría al
    // lector de pantalla en mitad de una respuesta.
    expect(notice(mount(StudioMemoryNotice, { props: { pressure: 0.9 } })).attributes('aria-live')).toBe('polite');
  });
});
