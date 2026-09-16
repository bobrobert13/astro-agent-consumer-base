/**
 * @file tests/dom/navigation-progress.spec.ts
 * @description La barra de navegación del shell.
 *
 * Se prueba con los eventos de verdad (`astro:before-preparation`,
 * `astro:page-load` despachados sobre `document`) porque el componente no tiene
 * props: toda su lógica es reaccionar al ciclo de vida del `ClientRouter`. Un test
 * que llamara a los manejadores directamente no probaría lo único que puede
 * romperse —el nombre del evento o el objeto sobre el que se escucha—.
 */
import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';

import NavigationProgress from '@domains/app-shell/components/NavigationProgress.vue';

const CEILING = 88;

let bar: ReturnType<typeof mount> | undefined;

/**
 * Monta y registra la isla para desmontarla siempre. No es ceremonia: cada
 * `astro:before-preparation` deja un `setInterval` vivo, y sin desmontar, el test
 * que cuenta temporizadores mide los residuos de los tests anteriores en vez de
 * los suyos (pasó: contaba 10).
 */
function mountBar(): ReturnType<typeof mount> {
  bar = mount(NavigationProgress);
  return bar;
}

/** `aria-valuenow` del progressbar de reka, que es el valor que se pinta. */
function valueOf(wrapper: ReturnType<typeof mount>): number {
  return Number(wrapper.get('[data-slot="progress"]').attributes('aria-valuenow'));
}

function classesOf(wrapper: ReturnType<typeof mount>): string {
  return wrapper.classes().join(' ');
}

beforeEach(() => vi.useFakeTimers());

afterEach(() => {
  bar?.unmount();
  bar = undefined;
  vi.useRealTimers();
});

describe('NavigationProgress', () => {
  it('arranca oculta y sin valor', () => {
    const wrapper = mountBar();

    expect(classesOf(wrapper)).toContain('opacity-0');
    expect(valueOf(wrapper)).toBe(0);
  });

  it('aparece al empezar la navegación y avanza sin llegar al 100 %', async () => {
    const wrapper = mountBar();

    document.dispatchEvent(new Event('astro:before-preparation'));
    await nextTick();

    expect(classesOf(wrapper)).toContain('opacity-100');
    const start = valueOf(wrapper);
    expect(start).toBe(10);

    vi.advanceTimersByTime(1_000);
    await nextTick();

    // Avanza sola, pero se queda por debajo del techo: el 100 % lo pone el fin
    // real de la navegación, no el temporizador.
    const later = valueOf(wrapper);
    expect(later).toBeGreaterThan(start);
    expect(later).toBeLessThanOrEqual(CEILING);
  });

  it('completa y se desvanece al terminar la página', async () => {
    const wrapper = mountBar();

    document.dispatchEvent(new Event('astro:before-preparation'));
    await nextTick();
    document.dispatchEvent(new Event('astro:page-load'));
    await nextTick();

    expect(valueOf(wrapper)).toBe(100);

    vi.advanceTimersByTime(400);
    await nextTick();

    expect(classesOf(wrapper)).toContain('opacity-0');
    // A 0 el indicador mide 0: no queda un trozo pintado tras el desvanecido.
    expect(valueOf(wrapper)).toBe(0);
  });

  it('ignora un `page-load` suelto, como el de la carga inicial', async () => {
    const wrapper = mountBar();

    // El evento también se dispara en la primera carga, cuando esta isla todavía
    // se está montando: si no se filtrara, la barra parpadearía al abrir cualquier
    // página directamente.
    document.dispatchEvent(new Event('astro:page-load'));
    await nextTick();

    expect(valueOf(wrapper)).toBe(0);
    expect(classesOf(wrapper)).toContain('opacity-0');
  });

  it('no se queda avanzando si la navegación se cancela', async () => {
    const wrapper = mountBar();

    document.dispatchEvent(new Event('astro:before-preparation'));
    await nextTick();

    // Sin `page-load` (navegación cancelada), la red de seguridad la cierra.
    vi.advanceTimersByTime(8_000);
    await nextTick();
    vi.advanceTimersByTime(400);
    await nextTick();

    expect(classesOf(wrapper)).toContain('opacity-0');
    expect(valueOf(wrapper)).toBe(0);
  });

  it('se lleva sus temporizadores al desmontarse', async () => {
    const wrapper = mountBar();

    document.dispatchEvent(new Event('astro:before-preparation'));
    await nextTick();
    // A mitad de navegación hay dos vivos: el avance y la red de seguridad.
    const during = vi.getTimerCount();
    expect(during).toBe(2);

    wrapper.unmount();
    bar = undefined;

    // Un `setInterval` huérfano sobrevive a la isla y sigue tocando un ref muerto:
    // es la fuga clásica de este patrón.
    expect(vi.getTimerCount()).toBe(0);
  });
});
