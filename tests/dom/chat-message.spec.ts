/**
 * @file tests/dom/chat-message.spec.ts
 * @description Regresión del globo en vuelo.
 *
 * `ChatTranscript` sintetiza el mensaje que se está generando con `id` y
 * `status` **constantes**, y `ChatMessage` lo memoriza con `v-memo`. Cuando las
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

import ChatMessage from '@domains/agent-chat/components/ChatMessage.vue';
import { messageMemoDeps, messageTextLength } from '@domains/agent-chat/components/chat.memo';
import type { ChatMessage as ChatMessageModel } from '@domains/agent-chat';

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

describe('ChatMessage', () => {
  it('repinta el globo cuando llega más texto a mitad de stream', async () => {
    const wrapper = mount(ChatMessage, { props: { message: streaming('Ho') } });
    // `MarkdownBlock` entra por `defineAsyncComponent`: su import se resuelve en
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
    const wrapper = mount(ChatMessage, {
      props: {
        message: { id: 'u1', role: 'user', parts: [{ type: 'text', text: 'hola' }], createdAt: '', status: 'done' },
      },
    });
    await flushPromises();

    expect(wrapper.html()).toContain('text-on-brand');
    expect(wrapper.html()).not.toContain('text-white');
  });

  it('muestra el mensaje de error del catálogo cuando el globo cierra con error', async () => {
    const wrapper = mount(ChatMessage, {
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
