/**
 * @file tests/dom/studio-islands.spec.ts
 * @description Regresión del atributo de persistencia dentro de las islas.
 *
 * Astro copia `transition:persist="…"` a las **props** de la isla
 * (`data-astro-transition-persist`) y Vue, que no la conoce, la deja caer al
 * primer elemento del DOM del componente. Con dos nodos marcados con el mismo
 * identificador, `swapBodyElement` de `ClientRouter` empareja los dos contra el
 * mismo destino: la segunda vuelta llama a `moveBefore` con un padre ya retirado,
 * la excepción corta el bucle y la isla que faltaba por reconectar queda huérfana
 * —como hija de `<html>`, fuera del `body`— mientras su gemela recién hidratada se
 * queda dentro. El síntoma en pantalla es la aplicación **duplicada**: dos
 * estudios, uno debajo del otro, y el `scrollHeight` al doble.
 *
 * El invariante que se fija aquí es de una línea: **ningún nodo del DOM de una
 * isla persistente puede llevar el atributo de persistencia**, solo la propia
 * isla. `inheritAttrs: false` en la raíz es lo que lo cumple.
 */
import { createPinia } from 'pinia';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import NavigationProgress from '@domains/app-shell/components/NavigationProgress.vue';
import ChatStudio from '@domains/chat-studio/components/ChatStudio.vue';

const PERSIST = 'data-astro-transition-persist';

describe('islas con transition:persist', () => {
  it('NavigationProgress no filtra el atributo de persistencia a su DOM', () => {
    const wrapper = mount(NavigationProgress, {
      attrs: { [PERSIST]: 'nav-progress' },
      global: { plugins: [createPinia()] },
    });

    // La raíz es un `<div>` normal: sin `inheritAttrs: false`, el atributo acaba
    // en él y le disputa el destino a la isla en el swap.
    expect(wrapper.find(`[${PERSIST}]`).exists()).toBe(false);
  });

  it('ChatStudio tampoco lo filtra', () => {
    const wrapper = mount(ChatStudio, {
      props: { agentId: 'communication-agent', threadId: 'nuevo' },
      attrs: { [PERSIST]: 'chat-studio' },
      global: { plugins: [createPinia()] },
    });

    expect(wrapper.find(`[${PERSIST}]`).exists()).toBe(false);
  });
});
