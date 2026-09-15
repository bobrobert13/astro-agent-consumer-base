import { createServer } from 'node:net';

/**
 * @file electron/lib/free-port.mjs
 * @description Puerto libre en el loopback.
 *
 * Se liga y se suelta, y se asume la pequeña carrera: entre que cerramos y que el
 * servidor Astro vuelve a abrir, otro proceso podría tomarlo. En loopback y con
 * un reintento, el riesgo es aceptable y mucho más simple que pasar el socket
 * abierto al proceso hijo.
 */
export async function freePort(host = '127.0.0.1') {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const port = await probe(host);
    if (port !== undefined) return port;
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
  throw new Error('No se encontró un puerto libre en el loopback.');
}

function probe(host) {
  return new Promise((resolve) => {
    const server = createServer();
    server.unref();
    server.on('error', () => resolve(undefined));
    server.listen(0, host, () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}
