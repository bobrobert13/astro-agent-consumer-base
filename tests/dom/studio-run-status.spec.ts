/**
 * @file tests/dom/studio-run-status.spec.ts
 * @description El turno en curso: qué se ve mientras el agente trabaja.
 *
 * Es el contrato de la corrección de la franja anterior, que ocupaba el ancho
 * completo y anunciaba "Conectando con el agente…" en **cada** envío. Aquí se
 * fija lo que decide ESTE componente: la conexión se anuncia solo en el primer
 * envío del hilo, el hueco del turno no se pinta cuando ya hay texto en vuelo, y
 * una ejecución parada ofrece reintentar en el propio hilo.
 */
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import StudioRunStatus from '@domains/chat-studio/components/StudioRunStatus.vue';

function run(props: { state: 'idle' | 'connecting' | 'streaming' | 'stalled' | 'error'; firstRun: boolean; pending: boolean }) {
  return mount(StudioRunStatus, { props });
}

describe('StudioRunStatus', () => {
  it('anuncia la conexión en el primer envío del hilo', () => {
    const wrapper = run({ state: 'connecting', firstRun: true, pending: true });

    expect(wrapper.text()).toContain('Conectando con el agente…');
    // La región sigue siendo la del contrato con los tests.
    expect(wrapper.get('[aria-label="Estado de la ejecución"]').attributes('aria-live')).toBe('polite');
  });

  it('no vuelve a anunciarla cuando el hilo ya tiene respuesta', () => {
    const wrapper = run({ state: 'connecting', firstRun: false, pending: true });

    // Ni el texto visible ni el de lectores de pantalla repiten la conexión.
    expect(wrapper.text()).not.toContain('Conectando');
    expect(wrapper.text()).toContain('Generando respuesta…');
  });

  it('no ocupa hueco mientras ya está llegando texto', () => {
    // El globo del stream es el que informa; un segundo indicador sería ruido.
    expect(run({ state: 'streaming', firstRun: false, pending: false }).text()).toBe('');
  });

  it('ofrece reintentar cuando la ejecución se queda parada', async () => {
    const wrapper = run({ state: 'stalled', firstRun: false, pending: false });

    expect(wrapper.text()).toContain('Sin respuesta del agente.');
    await wrapper.get('button').trigger('click');
    expect(wrapper.emitted('retry')).toHaveLength(1);
  });

  it('no pinta nada en reposo', () => {
    expect(run({ state: 'idle', firstRun: true, pending: true }).text()).toBe('');
  });
});
