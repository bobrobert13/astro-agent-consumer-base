/**
 * @file tests/tooling.spec.ts
 * @description Humo del andamiaje: si esto falla, el problema es de
 * configuración (alias de Vitest, resolución de `pinia`, entorno Node) y no de
 * código de la app. Falla rápido y sin ambigüedad antes de culpar a una feature.
 */
import { describe, expect, it } from 'vitest';

import { aliases } from '../aliases.mjs';
import { pinia } from '@stores/pinia';

describe('andamiaje', () => {
  it('resuelve los alias compartidos entre Astro y Vitest', () => {
    expect(aliases['@shared'].endsWith('/src/shared')).toBe(true);
    expect(aliases['@domains'].endsWith('/src/domains')).toBe(true);
  });

  it('instancia Pinia como singleton de módulo importable', () => {
    expect(pinia).toBeTruthy();
    // `use()` devuelve el propio pinia: es lo que permite encadenarlo en el
    // `appEntrypoint` de cada isla.
    expect(pinia.use(() => ({}))).toBe(pinia);
  });
});
