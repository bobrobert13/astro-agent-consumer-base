/**
 * @file tests/dom/studio-attachments.spec.ts
 * @description Adjuntar archivos en el composer: la ficha, el quitar y lo que
 * viaja en el mensaje.
 *
 * Lo que se fija aquí es el contrato del mock: el archivo entra por el selector del
 * sistema, se ve como ficha con su nombre y su tamaño, se puede quitar, y al enviar
 * **su lista acompaña al texto** del mensaje. Esa última parte es la que hace que
 * adjuntar signifique algo hoy: si el archivo desapareciera al enviar, la promesa
 * del botón sería decorativa.
 *
 * El motor y los adjuntos son singletons de módulo (compartidos, como todo el
 * estado del estudio), así que cada caso empieza limpio: conversación vacía y lista
 * de adjuntos vacía.
 */
import { createPinia } from 'pinia';
import { defineComponent, effectScope, h, nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import StudioComposer from '@domains/chat-studio/components/StudioComposer.vue';
import { provideStudioShell } from '@domains/chat-studio/composables/useStudioShell';
import { useStudioAttachments } from '@domains/chat-studio/composables/useStudioAttachments';
import { TooltipProvider } from '@components/ui/tooltip';
import { useAgentChat } from '@domains/agent-chat';

/**
 * Fuera de un componente hace falta un scope propio: `createSharedComposable`
 * engancha la limpieza al scope activo y sin él avisa por consola.
 */
function shared<T>(composable: () => T): T {
  const scope = effectScope(true);
  const instance = scope.run(composable);
  if (instance === undefined) throw new Error('el composable no devolvió instancia');
  return instance;
}

function mountComposer() {
  const Root = defineComponent({
    name: 'StudioComposerHarness',
    setup() {
      provideStudioShell();
      return () => h(TooltipProvider, null, { default: () => h(StudioComposer) });
    },
  });

  return mount(Root, { global: { plugins: [createPinia()] } });
}

/** El selector de archivos es del sistema y va oculto, así que se busca por tipo. */
async function pick(wrapper: ReturnType<typeof mountComposer>, files: File[]) {
  const input = wrapper.get('input[type="file"]');
  Object.defineProperty(input.element, 'files', { value: files, configurable: true });
  await input.trigger('change');
}

beforeEach(() => {
  shared(useStudioAttachments).clear();
  shared(useAgentChat).clearConversation();
});

describe('adjuntos del composer', () => {
  it('elegir un archivo lo deja como ficha con su nombre y su tamaño', async () => {
    const wrapper = mountComposer();

    await pick(wrapper, [new File(['hola'], 'notas.txt', { type: 'text/plain' })]);

    const chip = wrapper.findAll('li').find((node) => node.text().includes('notas.txt'));
    expect(chip).toBeDefined();
    expect(chip?.text()).toContain('4 B');
    // Y avisa de que todavía no sale de aquí: es un mock declarado.
    expect(wrapper.text()).toContain('todavía no se suben a ningún sitio');
  });

  it('quitarla la quita', async () => {
    const wrapper = mountComposer();
    await pick(wrapper, [new File(['hola'], 'notas.txt')]);

    const remove = wrapper.findAll('button').find((node) => node.attributes('aria-label') === 'Quitar adjunto: notas.txt');
    expect(remove).toBeDefined();
    await remove?.trigger('click');

    expect(wrapper.findAll('li').some((node) => node.text().includes('notas.txt'))).toBe(false);
  });

  it('un adjunto solo ya se puede enviar', async () => {
    const wrapper = mountComposer();
    const send = () => wrapper.findAll('button').find((node) => node.attributes('aria-label') === 'Enviar mensaje');

    // Sin texto no hay mensaje que enviar… salvo que venga con un archivo.
    expect(send()?.attributes('disabled')).toBeDefined();

    await pick(wrapper, [new File(['hola'], 'notas.txt')]);

    expect(send()?.attributes('disabled')).toBeUndefined();
  });

  it('al enviar, la lista de adjuntos acompaña al texto y la ficha se limpia', async () => {
    const wrapper = mountComposer();
    await pick(wrapper, [new File(['hola'], 'notas.txt')]);
    await wrapper.get('#aac-composer').setValue('resume esto');

    await wrapper.get('form').trigger('submit');
    await nextTick();

    const chat = shared(useAgentChat);
    await vi.waitFor(() => expect(chat.messages.value.length).toBeGreaterThan(0), { timeout: 3_000, interval: 20 });

    const first = chat.messages.value[0];
    const text = first?.parts.find((part) => part.type === 'text')?.text ?? '';
    expect(first?.role).toBe('user');
    expect(text).toContain('Adjuntos: notas.txt (4 B)');
    expect(text).toContain('resume esto');

    // La ficha desaparece con el envío: lo que se ha ido ya está en el mensaje.
    expect(wrapper.findAll('li').some((node) => node.text().includes('notas.txt'))).toBe(false);
  });
});
