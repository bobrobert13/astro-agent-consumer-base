/**
 * @file tests/dom/studio-notice.spec.ts
 * @description El aviso de bloqueo en el globo del transcript.
 *
 * Existe porque el backend bloquea con una parte `data-tripwire` y, hasta que el
 * adapter la tradujo, la UI pintaba un globo VACÍO: la persona escribía y no veía
 * nada, que es peor que un error. Aquí se fija que el aviso se ve.
 */
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import type { ChatMessage as ChatMessageModel } from '@domains/agent-chat';
import StudioMessage from '@domains/chat-studio/components/StudioMessage.vue';

const bubble = (parts: ChatMessageModel['parts']): ChatMessageModel => ({
  id: 'n1',
  role: 'assistant',
  parts,
  createdAt: '',
  status: 'done',
});

describe('StudioMessage — aviso de bloqueo', () => {
  it('pinta el aviso con su detalle', () => {
    const wrapper = mount(StudioMessage, {
      props: {
        message: bubble([
          {
            type: 'notice',
            text: 'Este agente solo atiende su ámbito. Prueba con otro agente del catálogo.',
            detail: 'Research Agent only handles web research.',
          },
        ]),
      },
    });

    expect(wrapper.text()).toContain('Este agente solo atiende su ámbito');
    expect(wrapper.text()).toContain('Research Agent only handles web research');
  });

  it('sin detalle no inventa una línea vacía', () => {
    const wrapper = mount(StudioMessage, {
      props: { message: bubble([{ type: 'notice', text: 'El mensaje se bloqueó por seguridad.' }]) },
    });

    expect(wrapper.text()).toContain('El mensaje se bloqueó por seguridad.');
    expect(wrapper.findAll('p')).toHaveLength(1);
  });

  it('el aviso no se confunde con una respuesta del agente', () => {
    // El bloqueo es el desenlace de la ejecución, no contenido: por eso vive en su
    // propio bloque y no dentro del markdown.
    const wrapper = mount(StudioMessage, {
      props: { message: bubble([{ type: 'notice', text: 'Bloqueado.' }]) },
    });

    expect(wrapper.find('.prose').exists()).toBe(false);
  });
});
