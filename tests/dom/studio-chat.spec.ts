/**
 * @file tests/dom/studio-chat.spec.ts
 * @description El estudio, de punta a punta y sin backend.
 *
 * Monta el panel con el transporte `mock` (el stub de `astro:env/client` lo fija)
 * y espera a que la ejecución termine de verdad. Es la única prueba que cruza las
 * tres piezas que se rompen por separado: el bucle de streaming de
 * `useAgentChat`, la política de re-render de la vista (búfer en vuelo + `v-memo`)
 * y el DOM de `StudioThread`/`StudioMessage`.
 *
 * Por eso existe: el smoke de Electron comprueba que hay texto en pantalla, pero
 * no que el texto **esté en el globo correcto** ni que el tool-call sobreviva al
 * `v-memo`. Un fallo ahí se ve como una respuesta a medias.
 *
 * No se monta `ChatStudio` entero a propósito: arrastraría el rail, el cajón y
 * los atajos globales, que no participan en lo que se prueba, y obligaría a
 * simular la navegación. El arnés aporta lo mismo que la raíz —el shell provisto y
 * el `TooltipProvider`— y nada más.
 *
 * `useAgentChat` es un `createSharedComposable`: el estado se comparte entre
 * montajes dentro del mismo archivo, así que cada test usa un hilo distinto
 * (`setThread` limpia la conversación) para no depender del orden.
 */
import { createPinia } from 'pinia';
import { defineComponent, h } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import { TooltipProvider } from '@components/ui/tooltip';
import { useAgentChat } from '@domains/agent-chat';
import StudioPanel from '@domains/chat-studio/components/StudioPanel.vue';
import { provideStudioShell } from '@domains/chat-studio/composables/useStudioShell';

const STOP = '[aria-label="Detener la respuesta"]';
const SEND = '[aria-label="Enviar mensaje"]';
const TRANSCRIPT = '[aria-label="Conversación con el agente"]';

type Wrapper = ReturnType<typeof mount>;

function mountPanel(threadId: string): Wrapper {
  const Harness = defineComponent({
    name: 'StudioHarness',
    setup() {
      provideStudioShell();
      const { setAgent, setThread } = useAgentChat();
      setAgent('research');
      setThread(threadId);
      return () => h(TooltipProvider, null, { default: () => h(StudioPanel) });
    },
  });

  return mount(Harness, { global: { plugins: [createPinia()] } });
}

/**
 * Envía un prompt y espera al ciclo completo: primero a que la ejecución arranque
 * (si no, se daría por terminada antes de empezar) y después a que vuelva a
 * `idle`.
 *
 * La sincronización va con el botón del composer —`Detener` mientras corre,
 * `Enviar` al terminar— y **no** con un aviso de estado: el turno en curso solo se
 * pinta mientras no ha llegado texto, así que su presencia puede durar un
 * parpadeo y esperarlo sería una carrera.
 */
async function submitAndSettle(wrapper: Wrapper, prompt: string): Promise<void> {
  const textarea = wrapper.get('textarea');
  await textarea.setValue(prompt);
  await textarea.trigger('keydown', { key: 'Enter' });

  await vi.waitFor(() => expect(wrapper.find(STOP).exists()).toBe(true), { timeout: 5_000, interval: 20 });
  await vi.waitFor(() => expect(wrapper.find(SEND).exists()).toBe(true), { timeout: 20_000, interval: 50 });
  await flushPromises();
}

/**
 * Espera a que un texto aparezca en el transcript.
 *
 * Hace falta porque `StudioMarkdown` y `StudioToolCall` se cargan con
 * `defineAsyncComponent`: su primer render deja un hueco y el contenido llega una
 * vez resuelto el import dinámico. Un `flushPromises()` no basta — el import se
 * resuelve en el siguiente turno del event loop, no en el microtask.
 */
async function expectTranscript(wrapper: Wrapper, text: string): Promise<void> {
  await vi.waitFor(() => expect(wrapper.get(TRANSCRIPT).text()).toContain(text), {
    timeout: 5_000,
    interval: 50,
  });
}

describe('StudioPanel', () => {
  it('pinta la respuesta completa y el tool-call en el mismo transcript', async () => {
    const wrapper = mountPanel('e2e-1');

    await submitAndSettle(wrapper, 'explícame el boilerplate');

    const transcript = wrapper.get(TRANSCRIPT).text();

    // El prompt de la persona, la respuesta del agente y la tarjeta de la
    // herramienta conviven en el transcript. Si el `v-memo` volviera a memorizar
    // sin mirar el contenido, el tool-call o el texto no aparecerían.
    expect(transcript).toContain('explícame el boilerplate');
    expect(transcript).toContain('agente de investigación simulado');
    await expectTranscript(wrapper, 'buscar_documentacion');

    // Con memoria holgada no hay aviso: el caso normal no arrastra ruido.
    expect(wrapper.text()).not.toContain('va llena');
  });

  it('cambia el estado vacío por el hilo en cuanto hay conversación', async () => {
    const wrapper = mountPanel('e2e-2');

    // Estado vacío: el titular del hero y las tarjetas están, y no hay transcript.
    expect(wrapper.find('h1').exists()).toBe(true);
    expect(wrapper.findAll('article')).toHaveLength(0);

    await submitAndSettle(wrapper, 'hola');

    // Con conversación, el hero se retira y los globos aparecen. El composer sigue
    // disponible: es lo que la plantilla original no hacía.
    expect(wrapper.find('h1').exists()).toBe(false);
    expect(wrapper.findAll('article').length).toBeGreaterThan(0);
    expect(wrapper.find('textarea').exists()).toBe(true);
  });

  it('avisa cuando la memoria del hilo se está llenando', async () => {
    const wrapper = mountPanel('e2e-3');

    await submitAndSettle(wrapper, '/memory');

    // Camino completo: el backend reporta la presión en una parte de datos, el
    // composable la lee por `onData` y la vista la convierte en aviso. Si el
    // `onData` dejara de estar cableado, esto no aparecería y nada más lo notaría.
    expect(wrapper.text()).toContain('La memoria de este hilo va llena');
    expect(wrapper.text()).toContain('96 %');
  });

  it('muestra el aviso cuando el backend bloquea el mensaje', async () => {
    const wrapper = mountPanel('e2e-4');

    await submitAndSettle(wrapper, '/tripwire');

    // El bloqueo llega como parte de datos dentro del mensaje del asistente. Si el
    // adapter dejara de traducirla, aquí habría un globo VACÍO: la persona escribe
    // y no ve nada, que es peor que un error.
    expect(wrapper.text()).toContain('Este agente solo atiende su ámbito');
    expect(wrapper.text()).toContain('Research Agent only handles web research');
  });

  it('no deja globos sin contenido cuando la ejecución termina', async () => {
    const wrapper = mountPanel('e2e-5');

    await submitAndSettle(wrapper, 'otra pregunta');

    // Un globo sin texto es una burbuja de tamaño cero que se lee como un fallo de
    // pintado. Se comprueba sobre los globos reales del transcript: el de la
    // persona, el del agente y el sintético de la respuesta en vuelo.
    const bubbles = wrapper.findAll('article');
    expect(bubbles.length).toBeGreaterThan(0);
    for (const bubble of bubbles) {
      expect(bubble.text().trim().length).toBeGreaterThan(0);
    }
  });

  it('deja el composer vacío y con el botón de enviar al terminar', async () => {
    const wrapper = mountPanel('e2e-6');

    const textarea = wrapper.get('textarea');
    await textarea.setValue('hola');
    await textarea.trigger('keydown', { key: 'Enter' });

    // Con el stream vivo, el botón de enviar se convierte en el de detener.
    await vi.waitFor(() => expect(wrapper.find(STOP).exists()).toBe(true), {
      timeout: 5_000,
      interval: 20,
    });

    await vi.waitFor(() => expect(wrapper.find(SEND).exists()).toBe(true), {
      timeout: 20_000,
      interval: 50,
    });
    expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe('');
  });

  it('el error de la ejecución sale del catálogo en español', async () => {
    const wrapper = mountPanel('e2e-7');

    await submitAndSettle(wrapper, '/error');

    expect(wrapper.text()).toContain('No puedo hablar con el backend de agentes.');
  });
});
