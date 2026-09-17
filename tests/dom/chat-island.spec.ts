/**
 * @file tests/dom/chat-island.spec.ts
 * @description La isla de chat, de punta a punta y sin backend.
 *
 * Monta `ChatIsland` con el transporte `mock` (el stub de `astro:env/client` lo
 * fija) y espera a que la ejecución termine de verdad. Es la única prueba que
 * cruza las tres piezas que se rompen por separado: el bucle de streaming de
 * `useAgentChat`, la política de re-render de `useChatTranscript` (búfer en
 * vuelo + `v-memo`) y el DOM de `ChatTranscript`/`ChatMessage`.
 *
 * Por eso existe: el smoke de Electron comprueba que hay texto en pantalla, pero
 * no que el texto **esté en el globo correcto** ni que el tool-call sobreviva al
 * `v-memo`. Un fallo ahí se ve como una respuesta a medias.
 *
 * `useAgentChat` es un `createSharedComposable`: el estado se comparte entre
 * montajes dentro del mismo archivo, así que cada test usa un hilo distinto
 * (`setThread` limpia la conversación) para no depender del orden.
 */
import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import ChatIsland from '@domains/agent-chat/components/ChatIsland.vue';

/**
 * Envía un prompt y espera al ciclo completo: primero a que la ejecución arranque
 * (si no, se daría por terminada antes de empezar) y después a que vuelva a
 * `idle`, que es cuando la franja de estado desaparece.
 *
 * Se selecciona la franja **por su etiqueta**, no por `[role="status"]`: el aviso de
 * memoria (`MemoryNotice`) también es una región de estado y, a diferencia de esta,
 * persiste mientras la memoria siga llena — esperar su desaparición era esperar en
 * vano.
 */
async function submitAndSettle(wrapper: ReturnType<typeof mount>, prompt: string): Promise<void> {
  const textarea = wrapper.get('textarea');
  await textarea.setValue(prompt);
  await textarea.trigger('keydown', { key: 'Enter' });

  const band = '[aria-label="Estado de la ejecución"]';
  await vi.waitFor(() => expect(wrapper.find(band).exists()).toBe(true), {
    timeout: 5_000,
    interval: 20,
  });
  await vi.waitFor(() => expect(wrapper.find(band).exists()).toBe(false), {
    timeout: 20_000,
    interval: 50,
  });
  await flushPromises();
}

/**
 * Espera a que un texto aparezca en el transcript.
 *
 * Hace falta porque `ToolCallCard` y `MarkdownBlock` se cargan con
 * `defineAsyncComponent`: su primer render deja un hueco y el contenido llega una
 * vez resuelto el import dinámico. Un `flushPromises()` no basta — el import se
 * resuelve en el siguiente turno del event loop, no en el microtask.
 */
async function expectTranscript(wrapper: ReturnType<typeof mount>, text: string): Promise<void> {
  await vi.waitFor(
    () => expect(wrapper.get('[aria-label="Conversación con el agente"]').text()).toContain(text),
    { timeout: 5_000, interval: 50 }
  );
}

describe('ChatIsland', () => {
  it('pinta la respuesta completa y el tool-call en el mismo transcript', async () => {
    const wrapper = mount(ChatIsland, { props: { agentId: 'research', threadId: 't1' } });

    await submitAndSettle(wrapper, 'explícame el boilerplate');

    const transcript = wrapper.get('[aria-label="Conversación con el agente"]').text();

    // El prompt del usuario, la respuesta del agente y la tarjeta de la
    // herramienta conviven en el transcript. Si el `v-memo` volviera a
    // memorizar sin mirar el contenido, el tool-call o el texto no aparecerían.
    expect(transcript).toContain('explícame el boilerplate');
    expect(transcript).toContain('agente de investigación simulado');
    await expectTranscript(wrapper, 'buscar_documentacion');

    // Con memoria holgada no hay aviso: el caso normal no arrastra ruido.
    expect(wrapper.text()).not.toContain('va llena');
  });

  it('avisa cuando la memoria del hilo se está llenando', async () => {
    const wrapper = mount(ChatIsland, { props: { agentId: 'research', threadId: 't5' } });

    await submitAndSettle(wrapper, '/memory');

    // Camino completo: el backend reporta la presión en una parte de datos, el
    // composable la lee por `onData` y la vista la convierte en aviso. Si el
    // `onData` dejara de estar cableado, esto no aparecería y nada más lo notaría.
    expect(wrapper.text()).toContain('La memoria de este hilo va llena');
    expect(wrapper.text()).toContain('96 %');
  });

  it('muestra el aviso cuando el backend bloquea el mensaje', async () => {
    const wrapper = mount(ChatIsland, { props: { agentId: 'research', threadId: 't6' } });

    await submitAndSettle(wrapper, '/tripwire');

    // El bloqueo llega como parte de datos dentro del mensaje del asistente. Si el
    // adapter dejara de traducirla, aquí habría un globo VACÍO: el usuario escribe y
    // no ve nada, que es peor que un error.
    expect(wrapper.text()).toContain('Este agente solo atiende su ámbito');
    expect(wrapper.text()).toContain('Research Agent only handles web research');
  });

  it('no deja globos sin contenido cuando la ejecución termina', async () => {
    const wrapper = mount(ChatIsland, { props: { agentId: 'research', threadId: 't2' } });

    await submitAndSettle(wrapper, 'otra pregunta');

    // Un globo sin texto es una burbuja de tamaño cero que se lee como un fallo
    // de pintado. Se comprueba sobre los globos reales del transcript: el del
    // usuario, el del agente y el sintético de la respuesta en vuelo.
    const bubbles = wrapper.findAll('article');
    expect(bubbles.length).toBeGreaterThan(0);
    for (const bubble of bubbles) {
      expect(bubble.text().trim().length).toBeGreaterThan(0);
    }
  });

  it('deja el composer vacío y habilitado al terminar la ejecución', async () => {
    const wrapper = mount(ChatIsland, { props: { agentId: 'research', threadId: 't3' } });

    const textarea = wrapper.get('textarea');
    await textarea.setValue('hola');
    await textarea.trigger('keydown', { key: 'Enter' });

    // Con el stream vivo el composer se deshabilita y aparece "Detener".
    await vi.waitFor(() => expect(wrapper.findAll('button').map((b) => b.text())).toContain('Detener'), {
      timeout: 5_000,
      interval: 20,
    });

    await vi.waitFor(
      () => expect(wrapper.findAll('button').map((b) => b.text())).toContain('Enviar'),
      { timeout: 20_000, interval: 50 }
    );
    expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe('');
  });

  it('el error de la ejecución sale del catálogo en español', async () => {
    const wrapper = mount(ChatIsland, { props: { agentId: 'research', threadId: 't4' } });

    await submitAndSettle(wrapper, '/error');

    expect(wrapper.text()).toContain('No puedo hablar con el backend de agentes.');
  });
});
