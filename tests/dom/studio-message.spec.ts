/**
 * @file tests/dom/studio-message.spec.ts
 * @description Regresión del globo en vuelo, ya en el estudio.
 *
 * `StudioThread` sintetiza el mensaje que se está generando con `id` y `status`
 * **constantes**, y `StudioMessage` lo memoriza con `v-memo`. Cuando las
 * dependencias del memo eran `[id, status]`, no cambiaban nunca dentro de una
 * respuesta: Vue reutilizaba el vnode y el texto visible se quedaba congelado en
 * el primer chunk hasta cerrar la respuesta. El resultado final siempre llegaba
 * bien —por eso `verify:electron`, que espera a que la respuesta se asiente, no
 * lo veía—, pero la persona veía un chat parado.
 *
 * El montaje real es lo único que cubre esto: el invariante es del render de Vue,
 * no de una función.
 */
import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import type { ChatMessage as ChatMessageModel } from '@domains/agent-chat';
import StudioMessage from '@domains/chat-studio/components/StudioMessage.vue';
import { messageMemoDeps, messageTextLength } from '@domains/chat-studio/components/studio.memo';

function streaming(text: string): ChatMessageModel {
  return { id: 'streaming', role: 'assistant', parts: [{ type: 'text', text }], createdAt: '', status: 'streaming' };
}

describe('dependencias de memo', () => {
  it('incluyen el texto, que es lo único que cambia dentro de una respuesta', () => {
    const before = messageMemoDeps(streaming('ho'));
    const after = messageMemoDeps(streaming('hola mundo'));
    expect(after).not.toEqual(before);
  });

  it('son estables para un mensaje cerrado', () => {
    const closed: ChatMessageModel = {
      id: 'm1',
      role: 'assistant',
      parts: [{ type: 'text', text: 'listo' }],
      createdAt: '2026-01-01',
      status: 'done',
    };
    expect(messageMemoDeps(closed)).toEqual(messageMemoDeps({ ...closed }));
  });

  it('cuentan también el texto de un mensaje con tool-calls', () => {
    expect(
      messageTextLength({
        id: 'm2',
        role: 'assistant',
        createdAt: '',
        status: 'done',
        parts: [
          { type: 'tool-call', toolName: 'buscar', args: { q: 'x' } },
          { type: 'text', text: 'cuatro' },
        ],
      })
    ).toBe(6);
  });
});

describe('StudioMessage', () => {
  it('repinta el globo cuando llega más texto a mitad de stream', async () => {
    const wrapper = mount(StudioMessage, { props: { message: streaming('Ho') } });
    // `StudioMarkdown` entra por `defineAsyncComponent`: su import se resuelve en
    // un tick que `flushPromises` no siempre alcanza (el transform del `.vue` es
    // E/S del module runner). Se espera al texto de verdad; si nunca llegara, el
    // fallo es el mismo que se está probando.
    await vi.waitFor(() => expect(wrapper.text()).toContain('Ho'), { timeout: 5000 });

    await wrapper.setProps({ message: streaming('Hola, ¿en qué piensas?') });

    // Con `v-memo` de dependencias constantes esto era lo que fallaba: el prop
    // cambiaba y el DOM no.
    await vi.waitFor(() => expect(wrapper.text()).toContain('Hola, ¿en qué piensas?'), { timeout: 5000 });
  });

  it('marca la burbuja del usuario con el token de marca, no con blanco literal', async () => {
    const wrapper = mount(StudioMessage, {
      props: {
        message: { id: 'u1', role: 'user', parts: [{ type: 'text', text: 'hola' }], createdAt: '', status: 'done' },
      },
    });
    await flushPromises();

    expect(wrapper.html()).toContain('text-on-brand');
    expect(wrapper.html()).not.toContain('text-white');
  });

  it('lleva el `<article>` y `rounded-bubble` que mide el gate de Electron', async () => {
    // El smoke localiza el transcript con `article .rounded-bubble`. Si alguien
    // renombra la clase, la prueba de Chromium deja de medir lo que cree medir.
    const wrapper = mount(StudioMessage, {
      props: {
        message: { id: 'u2', role: 'user', parts: [{ type: 'text', text: 'hola' }], createdAt: '', status: 'done' },
      },
    });

    expect(wrapper.element.tagName).toBe('ARTICLE');
    // El globo es un `<div>` y no un `<p>`: dentro van las tarjetas de herramienta,
    // y un bloque dentro de un párrafo es HTML inválido. El selector del gate es
    // `article .rounded-bubble`, que no depende de la etiqueta.
    expect(wrapper.find('.rounded-bubble').exists()).toBe(true);
  });

  it('muestra el mensaje de error del catálogo cuando el globo cierra con error', async () => {
    const wrapper = mount(StudioMessage, {
      props: {
        message: {
          id: 'e1',
          role: 'assistant',
          parts: [{ type: 'text', text: '' }],
          createdAt: '',
          status: 'error',
          error: 'No puedo hablar con el backend de agentes.',
        },
      },
    });
    await flushPromises();

    expect(wrapper.text()).toContain('No puedo hablar con el backend de agentes.');
  });
});
