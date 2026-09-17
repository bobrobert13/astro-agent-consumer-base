/**
 * @file tests/_fixtures/sse-stub.mjs
 * @description Backend de agentes falsificado: emula las dos rutas que ejercita el
 * BFF —el catálogo JSON del API del framework y el stream de chat en la raíz— con
 * el formato de UI-messages que usa el stack.
 *
 * Uso:
 *   node tests/_fixtures/sse-stub.mjs [puerto] [retardo-ms-por-frame]
 *
 * Está pensado para verificación manual (`curl -N`) y para el smoke del relay, no
 * para los tests unitarios: esos simulan `fetch` en memoria.
 */
import { createServer } from 'node:http';

const port = Number(process.argv[2] ?? 4111);
const delayMs = Number(process.argv[3] ?? 0);

const sleep = (ms) => (ms === 0 ? Promise.resolve() : new Promise((r) => setTimeout(r, ms)));

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${port}`);

  if (url.pathname === '/api/agents') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({
      agents: {
        research: {
          id: 'research',
          name: 'Investigación',
          description: 'Agente de ejemplo del stub.',
          instructions: 'INSTRUCCIONES-INTERNAS-NO-PUBLICABLES',
          cost: { cents: 9999 },
        },
      },
    }));
    return;
  }

  if (url.pathname === '/health/version') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', version: '0.0.0-stub', env: 'test' }));
    return;
  }

  // Ruta custom de chat: cuelga de la RAÍZ, no de `/api` (el `/api` lo reserva
  // Mastra para el framework). Emite el protocolo de UI-messages: un `data: <json>`
  // por parte y `data: [DONE]` al final.
  if (url.pathname.startsWith('/chat/')) {
    res.writeHead(200, {
      'content-type': 'text/event-stream',
      // Hostiles a propósito: el relay tiene que forzar `no-transform` pese a
      // este `max-age`, y no puede dejar pasar la cookie del backend.
      'cache-control': 'max-age=600',
      'set-cookie': 'secreto-del-upstream=1',
      date: 'siempre-ayer',
    });

    const agentId = url.pathname.split('/').pop();
    const frames = [
      { type: 'start', messageId: 'stub-message' },
      { type: 'text-start', id: 'stub-text' },
      { type: 'text-delta', id: 'stub-text', delta: `Hola desde ${agentId}.` },
      { type: 'text-delta', id: 'stub-text', delta: ' Segundo fragmento.' },
      { type: 'text-end', id: 'stub-text' },
      { type: 'finish' },
    ];

    for (const frame of frames) {
      await sleep(delayMs);
      res.write(`data: ${JSON.stringify(frame)}\n\n`);
    }
    res.write('data: [DONE]\n\n');
    res.end();
    return;
  }

  res.writeHead(404, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ error: 'ruta no conocida en el stub' }));
}).listen(port, '127.0.0.1', () => {
  console.log(`[sse-stub] escuchando en http://127.0.0.1:${port} (retardo ${delayMs} ms/frame)`);
});
