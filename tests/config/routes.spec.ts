/**
 * @file tests/config/routes.spec.ts
 * @description El contrato de URL de la vista de conectores.
 *
 * No es una prueba de utilidades de cadena: es la forma de la URL la que mantiene
 * vivo el estudio al abrir la capa. `hilo` y `agente` hacen que la isla persistida
 * reciba las mismas props (si faltaran, cambiaría de hilo y cortaría una respuesta
 * en curso) y `volver` es lo que permite regresar al sitio exacto, porque de `/` no
 * se vuelve igual que de `/chat/<hilo>`.
 *
 * Se comprueba también lo que **no** se escribe: una query vacía es una URL sucia
 * que se comparte tal cual, así que los valores ausentes no llegan a la ruta.
 */
import { describe, expect, it } from 'vitest';

import { routes } from '@config/routes';

describe('routes.connectors', () => {
  it('sin opciones es la ruta pelada', () => {
    expect(routes.connectors()).toBe('/conectores');
  });

  it('escribe solo lo que existe', () => {
    expect(routes.connectors({ tab: 'conocimiento' })).toBe('/conectores?pestana=conocimiento');
    expect(routes.connectors({ hilo: 'nuevo', agente: 'communication-agent' })).toBe(
      '/conectores?hilo=nuevo&agente=communication-agent'
    );
  });

  it('deja fuera los valores vacíos en vez de escribirlos', () => {
    expect(routes.connectors({ tab: '', hilo: undefined, agente: undefined, volver: undefined })).toBe('/conectores');
  });

  it('el camino de vuelta viaja codificado y se recupera entero', () => {
    const href = routes.connectors({ volver: '/chat/hoy-1?agente=x' });
    const [, query = ''] = href.split('?');

    expect(new URLSearchParams(query).get('volver')).toBe('/chat/hoy-1?agente=x');
  });
});
