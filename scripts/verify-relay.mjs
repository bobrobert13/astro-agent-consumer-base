/**
 * @file scripts/verify-relay.mjs
 * @description Smoke end-to-end del relay: levanta el backend de agentes
 * falsificado, levanta el servidor construido de Astro, y comprueba que el
 * reenvío es **byte a byte** y que nada del upstream se filtra al cliente.
 *
 * Existe porque los tests unitarios simulan `fetch` y no pueden ver esta clase de
 * fallo: la opción `duplex` que exige Node, el orden de las cabeceras, o un
 * `checkOrigin` devolviendo 403 a un POST bienformedado.
 *
 * Uso:  npm run build && node scripts/verify-relay.mjs
 */
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const STUB_PORT = 4117;
const APP_PORT = 4317;
const UPSTREAM = `http://127.0.0.1:${STUB_PORT}`;
const APP = `http://127.0.0.1:${APP_PORT}`;

const failures = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${label}${detail === '' ? '' : ` — ${detail}`}`);
  if (!ok) failures.push(label);
};

function start(args, env) {
  const handle = spawn(process.execPath, args, { env: { ...process.env, ...env }, stdio: 'ignore' });
  return handle;
}

async function waitReady(url, tries = 40) {
  for (let attempt = 0; attempt < tries; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(500) });
      if (response.ok) return true;
    } catch {
      /* todavía no escucha */
    }
    await sleep(250);
  }
  return false;
}

const stub = start(['tests/_fixtures/sse-stub.mjs', String(STUB_PORT)], {});
const server = start(['./dist/server/entry.mjs'], {
  PORT: String(APP_PORT),
  HOST: '127.0.0.1',
  MASTRA_URL: UPSTREAM,
});

// Cabeceras como las que manda un navegador: same-origin + JSON.
const browserHeaders = { 'content-type': 'application/json', origin: APP };

try {
  check('el stub del backend de agentes levanta', await waitReady(`${UPSTREAM}/api/agents`));
  const appUp = await waitReady(`${APP}/api/health`);
  check('el servidor construido de Astro levanta', appUp);

  if (appUp) {
    const health = await (await fetch(`${APP}/api/health`)).json();
    check('/api/health responde ok:true', health.ok === true, JSON.stringify(health));

    // Sonda profunda: es el único punto que confirma que el BFF llega al backend.
    const probe = await (await fetch(`${APP}/api/health/upstream`)).json();
    check(
      '/api/health/upstream alcanza el backend y lee su versión',
      probe.upstream?.reachable === true && probe.upstream?.version === '0.0.0-stub',
      JSON.stringify(probe)
    );

    // Un solo cuerpo para las dos llamadas: el relay reescribe `memory` (identidad
    // de memoria) pero el stub no lo mira, así que las respuestas deben ser iguales.
    const chatBody = JSON.stringify({
      agentId: 'research',
      messages: [{ id: 'verify-1', role: 'user', parts: [{ type: 'text', text: 'hola' }] }],
      memory: { thread: 'verify-relay' },
    });

    const direct = await fetch(`${UPSTREAM}/chat/research`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: chatBody,
    });
    const expected = await direct.text();

    const relayed = await fetch(`${APP}/api/agent-chat`, {
      method: 'POST',
      headers: browserHeaders,
      body: chatBody,
    });
    const actual = await relayed.text();

    check(
      'el relay reenvía el stream byte a byte',
      actual === expected && actual.length > 0,
      `${actual.length} bytes vs ${expected.length} esperados`
    );
    check(
      'el contenido sigue siendo event-stream (no un JSON de error)',
      relayed.headers.get('content-type')?.includes('text/event-stream') === true,
      String(relayed.headers.get('content-type'))
    );
    check(
      'el relay fuerza no-transform pese al cache-control del upstream',
      String(relayed.headers.get('cache-control')).includes('no-transform'),
      String(relayed.headers.get('cache-control'))
    );
    // El stub manda `set-cookie: secreto-del-upstream=1`. Esa cookie es del
    // backend y no puede llegar al navegador; la que sí sale es la identidad de
    // memoria que acuña el BFF cuando el navegador no la trae.
    const relayCookie = String(relayed.headers.get('set-cookie') ?? '');
    check(
      'el relay no filtra cookies del upstream',
      !relayCookie.includes('secreto-del-upstream'),
      relayCookie
    );
    check(
      'el relay fija la identidad de memoria del navegador',
      relayCookie.includes('aac_resource=') && relayCookie.includes('HttpOnly'),
      relayCookie
    );
    check('el gateway aporta x-request-id', relayed.headers.get('x-request-id') !== null);

    // El destino sale del cuerpo: sin `agentId` válido no se abre conexión.
    const noAgent = await fetch(`${APP}/api/agent-chat`, {
      method: 'POST',
      headers: browserHeaders,
      body: JSON.stringify({ messages: [{ id: 'x', role: 'user', parts: [] }] }),
    });
    check('sin agentId el BFF responde 400 y no reenvía', noAgent.status === 400, `status=${noAgent.status}`);

    // Un cross-origin con content-type "simple" tiene que seguir bloqueado.
    const cross = await fetch(`${APP}/api/agent-chat`, {
      method: 'POST',
      headers: { 'content-type': 'text/plain', origin: 'http://evil.example' },
      body: 'x',
    });
    check('checkOrigin sigue bloqueando el cross-site', cross.status === 403, `status=${cross.status}`);

    const agents = await (await fetch(`${APP}/api/agents`)).text();
    check('/api/agents normaliza el catálogo', agents.includes('"id":"research"'), agents.slice(0, 90));
    check(
      '/api/agents recorta instrucciones internas y costos',
      !agents.includes('INSTRUCCIONES-INTERNAS') && !agents.includes('cost')
    );
  }
} finally {
  stub.kill('SIGTERM');
  server.kill('SIGTERM');
  await sleep(150);
  stub.kill('SIGKILL');
  server.kill('SIGKILL');
}

console.log(failures.length === 0 ? '\nverify-relay: OK' : `\nverify-relay: ${failures.length} fallo(s)`);
process.exit(failures.length === 0 ? 0 : 1);
