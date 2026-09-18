/**
 * @file tests/dom/studio-sessions.spec.ts
 * @description El flujo de "nuevo chat" como sesión con hilo propio.
 *
 * Antes, "Nuevo chat" limpiaba la conversación y volvía a la raíz: la sesión nueva
 * no existía en ningún sitio y no había nada que comprobar. Aquí se fija lo que
 * ahora ocurre —se crea un hilo, se navega a `/chat/<hilo>` y la entrada aparece en
 * el historial— más el bautizo con el primer prompt.
 *
 * El estado de las sesiones es un singleton de módulo (compartido, como el del
 * chat), así que cada caso trabaja con la sesión que acaba de crear y nunca asume
 * una lista vacía.
 */
import { createPinia } from 'pinia';
import { effectScope } from 'vue';
import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it } from 'vitest';

import ChatStudio from '@domains/chat-studio/components/ChatStudio.vue';
import { useStudioSessions } from '@domains/chat-studio/composables/useStudioSessions';
import { STUDIO_HISTORY } from '@domains/chat-studio/data/studio.seed';
import { navigations, resetNavigations } from '../_stubs/astro-transitions-client';

/**
 * Fuera de un componente hace falta un scope propio: `createSharedComposable`
 * engancha la limpieza al scope activo y sin él avisa por consola.
 */
function sessions() {
  const scope = effectScope(true);
  const instance = scope.run(() => useStudioSessions());
  if (instance === undefined) throw new Error('el composable no devolvió instancia');
  return instance;
}

beforeEach(() => {
  resetNavigations();
});

describe('useStudioSessions', () => {
  it('crea un hilo y lo pone el primero del grupo de hoy', () => {
    const store = sessions();

    const id = store.create();

    expect(id).toMatch(/^sesion-/);
    expect(store.groups.value[0]?.entries[0]?.threadId).toBe(id);
    // El resto del historial de la semilla sigue ahí, detrás.
    expect(store.groups.value[0]?.entries.length).toBeGreaterThan((STUDIO_HISTORY[0]?.entries.length ?? 0));
  });

  it('bautiza la sesión con su primer prompt, una sola vez', () => {
    const store = sessions();
    const id = store.create();

    store.nameFromPrompt(id, '  Resume este documento\n  y dime qué falta  ');
    expect(store.groups.value[0]?.entries[0]?.label).toBe('Resume este documento y dime qué falta');

    // El segundo envío no la renombra: el nombre es de la sesión, no del mensaje.
    store.nameFromPrompt(id, 'otra cosa');
    expect(store.groups.value[0]?.entries[0]?.label).toBe('Resume este documento y dime qué falta');
  });

  it('acorta los prompts largos para que el rail no crezca', () => {
    const store = sessions();
    const id = store.create();

    store.nameFromPrompt(id, 'x'.repeat(200));
    const label = store.groups.value[0]?.entries[0]?.label ?? '';

    expect(label.length).toBeLessThanOrEqual(48);
    expect(label.endsWith('…')).toBe(true);
  });
});

describe('ChatStudio — nuevo chat', () => {
  it('crea la sesión y navega a su hilo, que queda en el historial', async () => {
    const wrapper = mount(ChatStudio, {
      props: { agentId: 'communication-agent', threadId: 'nuevo' },
      global: { plugins: [createPinia()] },
    });

    const button = wrapper.findAll('button').find((node) => node.text().includes('Nuevo chat'));
    expect(button).toBeDefined();
    await button?.trigger('click');

    // La intención de navegar es la del contrato de URL: una conversación, una
    // dirección. Sin el mock de sesiones, aquí se volvía a `/`.
    const target = navigations.at(-1) ?? '';
    expect(target).toMatch(/^\/chat\/sesion-/);

    const threadId = target.replace('/chat/', '');
    const entries = wrapper.findAll(`a[href="${target}"]`);
    expect(entries.length).toBeGreaterThan(0);
    expect(entries[0]?.text()).toContain('Nuevo chat');
    expect(threadId).not.toBe('nuevo');
  });
});
