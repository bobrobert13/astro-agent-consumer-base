import type { ChatMessage } from '../../../../types/chat.types';

/**
 * @file src/domains/agent-chat/composables/services/chat/data/chat.mock.ts
 * @description Transcript de ejemplo para pantallas vacías, stories y tests.
 *
 * No lo consume el transporte (ese tiene `chat.tokens.ts`): esto son datos ya
 * cerrados, para pintar una conversación realista sin ejecutar nada.
 */
export const sampleTranscript: ChatMessage[] = [
  {
    id: 'sample-1',
    role: 'user',
    parts: [{ type: 'text', text: '¿Qué hace este boilerplate?' }],
    createdAt: '2026-09-15T09:00:00.000Z',
    status: 'done',
  },
  {
    id: 'sample-2',
    role: 'assistant',
    parts: [
      {
        type: 'text',
        text: 'Sirve de punto de arranque para sistemas que consumen agentes: slicing vertical, un BFF en el propio servidor de Astro que reenvía el stream sin parsearlo, y una isla de chat que solo conoce un contrato de chunks.\n\nPara cambiar de proveedor se escribe un archivo en `transport/` y nada más.',
      },
    ],
    createdAt: '2026-09-15T09:00:04.000Z',
    status: 'done',
  },
  {
    id: 'sample-3',
    role: 'assistant',
    parts: [{ type: 'tool-call', toolName: 'leer_documento', args: { path: 'README.md' } }],
    createdAt: '2026-09-15T09:00:05.000Z',
    status: 'done',
  },
];

/** Conversación rota, para probar los estados de error en una pantalla fija. */
export const sampleWithError: ChatMessage[] = [
  {
    id: 'error-1',
    role: 'assistant',
    parts: [],
    createdAt: '2026-09-15T09:10:00.000Z',
    status: 'error',
    error: 'No puedo hablar con el backend de agentes. Comprueba que esté levantado o deja el transporte en mock.',
  },
];
