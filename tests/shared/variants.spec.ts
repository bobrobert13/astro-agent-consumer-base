/**
 * @file tests/shared/variants.spec.ts
 * @description `cn`/`variants` son el pegamento de clases entre `.astro` y `.vue`.
 * Se comprueba sobre todo lo que NO debe salir: `undefined`, `false` y cadenas
 * vacías, que es como se cuelan los `class="undefined"` en producción.
 */
import { describe, expect, it } from 'vitest';

import { cn, variants } from '@shared/ui/variants';

describe('cn', () => {
  it('une strings y descarta falses, nulls y vacíos', () => {
    expect(cn('a', null, undefined, false, '', 'b')).toBe('a b');
  });

  it('acepta objetos condicionales estilo clsx', () => {
    expect(cn('base', { open: true, closed: false })).toBe('base open');
  });

  it('aplan arrays anidados', () => {
    expect(cn(['a', ['b', { c: true }]])).toBe('a b c');
  });

  it('ignora un objeto con todas las llaves falsas', () => {
    expect(cn({ a: 0, b: '' })).toBe('');
  });
});

describe('variants', () => {
  const panel = variants({
    base: 'rounded-panel border',
    variants: {
      tone: { default: 'border-line', danger: 'border-danger' },
      pad: { none: '', sm: 'p-3' },
    },
    defaultVariants: { tone: 'default', pad: 'sm' },
  });

  it('aplica base + defaults en orden estable', () => {
    expect(panel()).toBe('rounded-panel border border-line p-3');
  });

  it('deja sobrescribir una variante sin perder la otra', () => {
    expect(panel({ tone: 'danger' })).toBe('rounded-panel border border-danger p-3');
  });

  it('concatena la clase extra del llamador al final', () => {
    expect(panel({ tone: 'danger' }, 'mt-4')).toBe('rounded-panel border border-danger p-3 mt-4');
  });

  it('una variante con valor vacío no deja doble espacio', () => {
    expect(panel({ pad: 'none' })).toBe('rounded-panel border border-line');
  });

  it('una variante no declarada se ignora en vez de reventar', () => {
    expect(panel({ tone: 'inventado' as 'default' })).toBe('rounded-panel border p-3');
  });
});
