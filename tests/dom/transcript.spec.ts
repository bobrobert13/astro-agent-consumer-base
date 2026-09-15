/**
 * @file tests/dom/transcript.spec.ts
 * @description Contrato de rendimiento del transcript, no de apariencia.
 *
 * Lo que se afirma aquí es la razón de ser de la política de
 * `useChatTranscript`: cien deltas no deben provocar cien re-render del
 * `v-for`. Se mide por identidad de la referencia del array, que es exactamente
 * lo que observa Vue para difuminar la lista.
 *
 * Nota: el proyecto `dom` corre en jsdom, donde `requestAnimationFrame` existe y
 * lo controlan los timers falsos de Vitest.
 */
import { watch } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useChatTranscript } from '@domains/agent-chat/composables/useChatTranscript';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('useChatTranscript', () => {
  it('cien deltas no cambian la referencia de la lista de mensajes', () => {
    const transcript = useChatTranscript();
    transcript.appendUser('hola');
    const afterUser = transcript.messages.value;

    transcript.startAssistant();
    for (let i = 0; i < 100; i += 1) transcript.pushDelta(`tok${i} `);

    // Nada entró en la lista mientras llegaba texto.
    expect(transcript.messages.value).toBe(afterUser);
    expect(transcript.messages.value).toHaveLength(1);
  });

  it('cien deltas dentro de un mismo frame producen UNA escritura visible', () => {
    const transcript = useChatTranscript();
    transcript.startAssistant();

    // `flush: 'sync'` cuenta asignaciones reales al ref, no renders de componente:
    // es la unidad que interesa, porque cada una re-difunde el nodo de texto.
    let writes = 0;
    watch(transcript.streamingText, () => (writes += 1), { flush: 'sync' });

    for (let i = 0; i < 100; i += 1) transcript.pushDelta(`x${i}`);
    vi.advanceTimersByTime(16);

    expect(writes).toBe(1);
    expect(transcript.streamingText.value).toContain('x99');
  });

  it('`finishAssistant` promociona el texto a un mensaje cerrado', () => {
    const transcript = useChatTranscript();
    transcript.startAssistant();
    transcript.pushDelta('parcial ');
    transcript.pushDelta('final');

    const closed = transcript.finishAssistant('done');

    expect(closed).toMatchObject({ role: 'assistant', status: 'done' });
    expect(closed?.parts).toEqual([{ type: 'text', text: 'parcial final' }]);
    expect(transcript.messages.value).toHaveLength(1);
    expect(transcript.streamingText.value).toBe('');
    expect(transcript.activeAssistantId.value).toBeUndefined();
  });

  it('cerrar dos veces no duplica el mensaje', () => {
    const transcript = useChatTranscript();
    transcript.startAssistant();
    transcript.pushDelta('una vez');

    transcript.finishAssistant('done');
    const second = transcript.finishAssistant('done');

    expect(second).toBeUndefined();
    expect(transcript.messages.value).toHaveLength(1);
  });

  it('un mensaje de error conserva su texto traducido', () => {
    const transcript = useChatTranscript();
    transcript.startAssistant();
    transcript.pushDelta('algo ');

    const message = transcript.finishAssistant('error', 'El agente no responde.');

    expect(message).toMatchObject({ status: 'error', error: 'El agente no responde.' });
    expect(message?.parts[0]).toEqual({ type: 'text', text: 'algo ' });
  });

  it('las tarjetas de herramienta se anexan sin tocar el globo en vuelo', () => {
    const transcript = useChatTranscript();
    transcript.startAssistant();
    transcript.pushDelta('texto');
    vi.advanceTimersByTime(16); // el batching entrega al final del frame
    transcript.appendToolCall('buscar', { q: 'x' });

    expect(transcript.messages.value).toHaveLength(1);
    expect(transcript.messages.value[0]?.parts[0]).toMatchObject({ type: 'tool-call', toolName: 'buscar' });
    expect(transcript.streamingText.value).toBe('texto');
  });

  it('`discardStreaming` tira el globo sin dejar mensaje fantasma', () => {
    const transcript = useChatTranscript();
    transcript.startAssistant();
    transcript.pushDelta('incompleto');
    transcript.discardStreaming();

    expect(transcript.messages.value).toHaveLength(0);
    expect(transcript.streamingText.value).toBe('');
  });
});
