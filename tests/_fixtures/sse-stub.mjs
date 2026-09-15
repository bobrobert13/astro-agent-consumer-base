/**
 * @file tests/_fixtures/sse-stub.mjs
 * @description Backend de agentes falsificado: emite SSE con el formato de
 * UI-messages que usa el stack, y emula los endpoints que ejercita el relay.
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

  if (url.pathname.startsWith('/api/stream/')) {
    res.writeHead(200, {
      'content-type': 'text/event-stream',
      'cache-control': 'max-age=600',
      'set-cookie': 'secreto-del-upstream=1',
      date: 'siempre-ayer',
    });

    const agentId = url.pathname.split('/').pop();
    const frames = [
      { type: 'start', payload: {} },
      { type: 'text-delta', payload: { text: `Hola desde ${agentId}.` } },
      { type: 'text-delta', payload: { text: ' Segundo fragmento.' } },
      { type: 'finish', payload: {} },
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
