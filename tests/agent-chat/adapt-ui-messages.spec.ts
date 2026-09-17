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
  memoryPressure,
  messageText,
  parseMemoryStatus,
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

/** Estado de memoria que el guion emite para un prompt, ya parseado. */
function omStatusOf(prompt: string) {
  const chunk = answerFor('research', prompt).find((c) => c.type === 'data-om-status');
  return parseMemoryStatus(chunk?.type === 'data-om-status' ? chunk.data : undefined);
}

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

describe('estado de memoria del hilo', () => {
  /** Payload con la forma real que emite Mastra en `data-om-status`. */
  const payload = (messageTokens: number, observationTokens = 0) => ({
    windows: {
      active: {
        messages: { tokens: messageTokens, threshold: 30_000 },
        observations: { tokens: observationTokens, threshold: 40_000 },
      },
      buffered: { observations: { chunks: 0 }, reflection: { status: 'idle' } },
    },
    threadId: 't1',
    stepNumber: 0,
  });

  it('lee las dos ventanas activas', () => {
    expect(parseMemoryStatus(payload(3_000, 5_000))).toEqual({
      messageTokens: 3_000,
      messageThreshold: 30_000,
      observationTokens: 5_000,
      observationThreshold: 40_000,
    });
  });

  it('degrada a `undefined` en vez de lanzar ante una forma que no reconoce', () => {
    // La forma es interna de Mastra: una versión que la cambie no puede romper el chat.
    for (const broken of [null, undefined, 'texto', 42, {}, { windows: {} }, { windows: { active: {} } }]) {
      expect(parseMemoryStatus(broken)).toBeUndefined();
    }
    // Umbrales presentes pero basura: tampoco hay estado que reportar.
    expect(parseMemoryStatus({ windows: { active: { messages: { threshold: 'muchos' } } } })).toBeUndefined();
  });

  it('la presión es la de la ventana MÁS llena, acotada a 1', () => {
    expect(memoryPressure(parseMemoryStatus(payload(0))!)).toBe(0);
    expect(memoryPressure(parseMemoryStatus(payload(15_000))!)).toBe(0.5);
    // La de mensajes manda aunque las observaciones estén vacías...
    expect(memoryPressure(parseMemoryStatus(payload(24_000))!)).toBeCloseTo(0.8);
    // ...y al revés también: gana la más llena de las dos.
    expect(memoryPressure(parseMemoryStatus(payload(0, 36_000))!)).toBeCloseTo(0.9);
    // Un backend que se pase de tokens no puede dar más de 1.
    expect(memoryPressure(parseMemoryStatus(payload(90_000))!)).toBe(1);
  });

  it('un umbral a 0 no produce un infinito', () => {
    const zero = parseMemoryStatus({
      windows: { active: { messages: { tokens: 5, threshold: 0 }, observations: { tokens: 0, threshold: 0 } } },
    });
    expect(zero).toBeDefined();
    expect(memoryPressure(zero!)).toBe(0);
  });

  it('lee el payload REAL que emitió el backend', () => {
    // Copiado byte a byte de la respuesta de `POST /chat/research-agent` contra
    // Mastra 1.66 con DeepSeek: si el backend cambia la forma, esto es lo primero
    // que se entera, y no una fixture que escribí yo a partir de mi propia idea.
    const real = {
      windows: {
        active: {
          messages: { tokens: 41, threshold: 30000 },
          observations: { tokens: 0, threshold: 40000 },
        },
        buffered: {
          observations: {
            chunks: 0,
            messageTokens: 0,
            projectedMessageRemoval: 0,
            observationTokens: 0,
            status: 'idle',
          },
          reflection: { inputObservationTokens: 0, observationTokens: 0, status: 'idle' },
        },
      },
      recordId: '972ee7fb-f658-489b-bd9a-cb30cfbd147c',
      threadId: 'smoke-check',
      stepNumber: 0,
      generationCount: 0,
    };

    expect(parseMemoryStatus(real)).toEqual({
      messageTokens: 41,
      messageThreshold: 30000,
      observationTokens: 0,
      observationThreshold: 40000,
    });
    // Y con el hilo recién empezado no hay nada que avisar.
    expect(memoryPressure(parseMemoryStatus(real)!)).toBeLessThan(0.01);
  });
});

describe('bloqueo del backend (tripwire)', () => {
  /** Un mensaje del asistente cuyo único contenido es el tripwire del backend. */
  const tripwire = (data: unknown) =>
    adaptTranscript(
      [{ id: 'a1', role: 'assistant', parts: [{ type: 'data-tripwire', data }] }],
      { inFlight: false }
    ).messages[0]?.parts[0];

  it('el scope guard produce un aviso, con su redirección como detalle', () => {
    expect(tripwire({ processorId: 'scope-guard:research', reason: 'Research Agent only handles web research.' })).toEqual({
      type: 'notice',
      text: 'Este agente solo atiende su ámbito. Prueba con otro agente del catálogo.',
      detail: 'Research Agent only handles web research.',
    });
  });

  it('un bloqueo de seguridad NO pinta el texto que redactó el modelo', () => {
    const part = tripwire({
      processorId: 'prompt-injection-detector',
      reason: 'The content contains the classic prompt injection phrase "Ignore all previous instructions".',
    });

    expect(part).toMatchObject({ type: 'notice', text: 'El mensaje se bloqueó por seguridad y no llegó al agente.' });
    expect(part).not.toHaveProperty('detail');
    expect(JSON.stringify(part)).not.toContain('classic prompt injection');
  });

  it('un tripwire ilegible no deja el globo mudo', () => {
    // Antes de traducirlo, la UI pintaba un globo vacío: el bloqueo parecía un fallo.
    for (const payload of [undefined, null, 'texto', {}]) {
      expect(tripwire(payload)).toMatchObject({
        type: 'notice',
        text: 'El mensaje se bloqueó por seguridad y no llegó al agente.',
      });
    }
  });

  it('un tripwire de alcance sin motivo sigue avisando', () => {
    expect(tripwire({ processorId: 'scope-guard:files' })).toMatchObject({ type: 'notice' });
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

  it('reporta memoria holgada por defecto, y casi llena con /memory', () => {
    // El caso normal no debe arrastrar un aviso en pantalla; `/memory` es el prompt
    // determinista para el caso que sí importa.
    const low = omStatusOf('una pregunta cualquiera');
    const high = omStatusOf('/memory');

    expect(low).toBeDefined();
    expect(high).toBeDefined();
    expect(memoryPressure(low!)).toBeLessThan(0.1);
    expect(memoryPressure(high!)).toBeGreaterThan(0.9);
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
