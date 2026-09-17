/**
 * @file tests/agent-chat/adapt-ui-messages.spec.ts
 * @description El puente entre el vocabulario del AI SDK y el del dominio.
 *
 * Es la pieza que sustituye a `translateChunk`: si el adapter miente, la UI
 * miente, y da igual que el SDK sea correcto. Se prueba sin montar Vue porque son
 * funciones puras.
 */
import type { UIMessage, UIMessageChunk } from 'ai';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  adaptTranscript,
  messageText,
  toStreamState,
  uiTextLength,
  type WireMessage,
} from '@domains/agent-chat/ai/adapt-ui-messages';
import { createMockChatTransport } from '@domains/agent-chat/ai/chat.transport.mock';
import { answerFor, paceFor, stallFor } from '@domains/agent-chat/ai/mock-script';
import { CHAT_ERROR_CODES } from '@domains/agent-chat/composables/services/chat/chat.e';
import { STREAM_STALL_MS } from '@config/app';

const SCOPE = { agentId: 'research', thread: 't1' };

/** Fixture de mensaje del SDK; el adapter lo lee por estructura. */
const USER_MESSAGE = {
  id: 'u1',
  role: 'user',
  parts: [{ type: 'text', text: 'hola' }],
} as unknown as UIMessage;

const user: WireMessage = { id: 'u1', role: 'user', parts: [{ type: 'text', text: 'hola' }] };
const assistant: WireMessage = { id: 'a1', role: 'assistant', parts: [{ type: 'text', text: 'buenas' }] };

describe('adaptTranscript', () => {
  it('mapea texto y llamadas a herramienta al vocabulario del dominio', () => {
    const adapted = adaptTranscript(
      [
        { id: 'a1', role: 'assistant', parts: [{ type: 'text', text: 'buenas' }] },
        {
          id: 'a2',
          role: 'assistant',
          parts: [
            { type: 'dynamic-tool', toolName: 'buscar', input: { q: 1 }, output: { hits: 3 } },
          ],
        },
      ],
      { inFlight: false }
    );

    expect(adapted.messages[0]).toMatchObject({ role: 'assistant', parts: [{ type: 'text', text: 'buenas' }] });
    expect(adapted.messages[1]?.parts[0]).toEqual({
      type: 'tool-call',
      toolName: 'buscar',
      args: { q: 1 },
      result: { hits: 3 },
    });
  });

  it('el globo en vuelo NO entra en la lista: su texto sale por `streamingText`', () => {
    const adapted = adaptTranscript([user, assistant], { inFlight: true });

    expect(adapted.messages).toHaveLength(1);
    expect(adapted.messages[0]?.role).toBe('user');
    expect(adapted.streamingText).toBe('buenas');
  });

  it('con el envío recién hecho (último mensaje del usuario) el usuario no desaparece', () => {
    const adapted = adaptTranscript([user], { inFlight: true });

    expect(adapted.messages).toHaveLength(1);
    expect(adapted.messages[0]?.role).toBe('user');
    expect(adapted.streamingText).toBe('');
  });

  it('el error del catálogo marca el último globo del asistente', () => {
    const adapted = adaptTranscript([user, assistant], { inFlight: false, errorText: 'No puedo hablar con el backend.' });

    expect(adapted.messages[1]).toMatchObject({ status: 'error', error: 'No puedo hablar con el backend.' });
  });

  it('la cancelación marca el globo como abortado', () => {
    const adapted = adaptTranscript([user, assistant], { inFlight: false, aborted: true });

    expect(adapted.messages[1]).toMatchObject({ status: 'aborted' });
  });

  it('un fallo sin globo del asistente recibe su propia burbuja', () => {
    // El backend puede rechazar antes de emitir un solo chunk: la lista termina
    // en el mensaje del usuario. Sin la burbuja sintética el error desaparecería.
    const adapted = adaptTranscript([user], { inFlight: false, errorText: 'No puedo hablar con el backend.' });

    expect(adapted.messages).toHaveLength(2);
    expect(adapted.messages[1]).toMatchObject({
      role: 'assistant',
      status: 'error',
      error: 'No puedo hablar con el backend.',
    });
  });

  it('sin error no se inventa ninguna burbuja', () => {
    expect(adaptTranscript([user], { inFlight: false }).messages).toHaveLength(1);
  });

  it('descarta las piezas que el dominio no sabe pintar', () => {
    const adapted = adaptTranscript(
      [
        {
          id: 'a1',
          role: 'assistant',
          parts: [
            { type: 'reasoning', text: 'pensando' },
            { type: 'step-start' },
            { type: 'file' },
            { type: 'data-progress' },
            { type: 'source-url' },
            { type: 'text', text: 'solo esto' },
          ],
        },
      ],
      { inFlight: false }
    );

    expect(adapted.messages[0]?.parts).toEqual([{ type: 'text', text: 'solo esto' }]);
  });

  it('una herramienta sin nombre recibe uno presentable', () => {
    const adapted = adaptTranscript([{ id: 'a1', role: 'assistant', parts: [{ type: 'tool-' }] }], { inFlight: false });

    expect(adapted.messages[0]?.parts[0]).toMatchObject({ type: 'tool-call', toolName: 'herramienta' });
  });

  it('una herramienta fallida expone su error como resultado', () => {
    const adapted = adaptTranscript(
      [
        {
          id: 'a1',
          role: 'assistant',
          parts: [{ type: 'dynamic-tool', toolName: 'buscar', input: { q: 1 }, errorText: 'no disponible' }],
        },
      ],
      { inFlight: false }
    );

    expect(adapted.messages[0]?.parts[0]).toMatchObject({ result: 'no disponible' });
  });

  it('un texto vacío no crea un globo vacío', () => {
    const adapted = adaptTranscript([{ id: 'a1', role: 'assistant', parts: [{ type: 'text', text: '' }] }], {
      inFlight: false,
    });

    expect(adapted.messages[0]?.parts).toEqual([]);
  });
});

describe('señales de actividad y estado', () => {
  it('`uiTextLength` suma el texto de todos los mensajes', () => {
    expect(uiTextLength([user, assistant])).toBe('hola'.length + 'buenas'.length);
  });

  it('`messageText` concatena las piezas de texto de un mensaje', () => {
    expect(messageText({ id: 'a', role: 'assistant', parts: [{ type: 'text', text: 'a' }, { type: 'text', text: 'b' }] })).toBe('ab');
  });

  it('`toStreamState` traduce el estado del SDK, con el silencio aparte', () => {
    expect(toStreamState('submitted', false)).toBe('connecting');
    expect(toStreamState('streaming', false)).toBe('streaming');
    expect(toStreamState('streaming', true)).toBe('stalled');
    expect(toStreamState('ready', false)).toBe('idle');
    expect(toStreamState('error', false)).toBe('error');
  });
});

describe('guion del transporte simulado', () => {
  it('abre el mensaje con `start` y cierra con `finish`', () => {
    const chunks = answerFor('research', 'normal');

    expect(chunks[0]).toMatchObject({ type: 'start' });
    expect(typeof (chunks[0] as { messageId?: string }).messageId).toBe('string');
    expect(chunks.at(-1)?.type).toBe('finish');
  });

  it('cada ejecución abre un mensaje con id propio', () => {
    // El id es la `:key` del transcript: repetirlo entre respuestas haría que Vue
    // reutilizara el nodo equivocado.
    expect(answerFor('research', 'una')[0]).not.toEqual(answerFor('research', 'otra')[0]);
  });

  it('/error cierra con el código del catálogo', () => {
    expect(answerFor('research', '/error')).toContainEqual({
      type: 'error',
      errorText: CHAT_ERROR_CODES.upstreamUnreachable,
    });
  });

  it('emite texto y una herramienta en medio, en ese orden', () => {
    const types = answerFor('research', 'normal').map((chunk) => chunk.type);

    expect(types).toContain('text-delta');
    expect(types.indexOf('tool-input-start')).toBeLessThan(types.indexOf('tool-input-available'));
    expect(types.indexOf('tool-input-available')).toBeLessThan(types.indexOf('tool-output-available'));
  });

  it('un agente sin frase asignada usa el texto genérico', () => {
    expect(answerFor('inexistente', 'cualquier cosa').some((chunk) => chunk.type === 'text-delta')).toBe(true);
  });

  it('/slow planifica un silencio más largo que el watchdog del cliente', () => {
    const stall = stallFor('/slow');
    expect(stall?.ms).toBeGreaterThan(STREAM_STALL_MS);
    expect(stall?.after).toBeGreaterThan(0);
  });

  it('cualquier otro prompt no planifica silencio', () => {
    expect(stallFor('normal')).toBeUndefined();
    expect(stallFor('/error')).toBeUndefined();
  });

  it('una llamada a herramienta se pausa más que un delta de texto', () => {
    expect(paceFor({ type: 'tool-input-available', toolCallId: 'c', toolName: 't', input: {} })).toBeGreaterThan(
      paceFor({ type: 'text-delta', id: 't', delta: 'x' })
    );
  });
});

describe('transporte simulado', () => {
  afterEach(() => vi.useRealTimers());

  async function drain(stream: ReadableStream<UIMessageChunk>): Promise<UIMessageChunk[]> {
    const chunks: UIMessageChunk[] = [];
    const reader = stream.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    return chunks;
  }

  function send(prompt: string, abortSignal?: AbortSignal) {
    const transport = createMockChatTransport(() => SCOPE);
    return transport.sendMessages({
      trigger: 'submit-message',
      chatId: 'c1',
      messageId: undefined,
      messages: [prompt === 'hola' ? USER_MESSAGE : ({ ...USER_MESSAGE, parts: [{ type: 'text', text: prompt }] } as UIMessage)],
      abortSignal,
    });
  }

  it('emite la secuencia completa sin tocar la red', async () => {
    vi.useFakeTimers();
    const reading = drain(await send('hola'));

    await vi.runAllTimersAsync();
    const types = (await reading).map((chunk) => chunk.type);

    expect(types).toContain('text-delta');
    expect(types).toContain('tool-input-available');
    expect(types).toContain('tool-output-available');
    expect(types.at(-1)).toBe('finish');
  });

  it('el abort corta la ejecución a mitad y no lanza', async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const reading = drain(await send('hola', controller.signal));

    // Se deja salir unos cuantos chunks y se corta: el bucle mira el signal antes
    // de cada uno, y el silencio de `/slow` también es interrumpible. La ventana
    // es holgada a propósito (los chunks van a ~56 ms) pero corta antes de que
    // llegue la herramienta, que es lo que se quiere comprobar que no pasa.
    await vi.advanceTimersByTimeAsync(300);
    controller.abort();
    await vi.runAllTimersAsync();
    const types = (await reading).map((chunk) => chunk.type);

    expect(types).toContain('text-delta');
    expect(types).not.toContain('tool-output-available');
  });

  it('no hay stream que retomar', async () => {
    const transport = createMockChatTransport(() => SCOPE);

    await expect(transport.reconnectToStream({ chatId: 'c1' })).resolves.toBeNull();
  });
});
