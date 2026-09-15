/**
 * @file src/shared/ui/variants.ts
 * @description Clasificador de utilidades de Tailwind: `cn()` y `variants()`.
 *
 * Escrito a mano a propósito, en vez de traer `class-variance-authority`. Las
 * razones son concretas del stack, no de gusto:
 *  - Tiene que poder llamarse igual desde el frontmatter de un `.astro` (donde no
 *    hay build de Vue ni genéricos visibles) que desde un `<script setup>`.
 *  - El 90 % de los casos aquí son `variante × tamaño × estado`; un objeto plano
 *    con `defaultVariants` lo cubre en ~40 líneas.
 *  - CVA añade una dependencia y una capa de tipos que en `.astro` no se ven.
 *
 * Los valores de cada variante son **clases de Tailwind literales**: el parser de
 * v4 barre el fuente, así que nada de construir clases por concatenación
 * (`text-${color}-500` no se genera). Los tokens se referencian con
 * `(--nombre)` para que el `@theme` de `global.css` sea la única fuente.
 */

export type ClassValue = string | number | null | undefined | false | ClassArray | ClassRecord;
type ClassArray = readonly ClassValue[];
interface ClassRecord {
  [className: string]: unknown;
}

/** Une clases condicionales. Equivalente funcional de `clsx`, sin dependencia. */
export function cn(...inputs: ClassValue[]): string {
  const out: string[] = [];
  collect(inputs, out);
  return out.join(' ');
}

function collect(value: ClassValue, out: string[]): void {
  if (value === null || value === undefined || value === false || value === '') return;

  if (typeof value === 'string' || typeof value === 'number') {
    out.push(String(value));
    return;
  }
  if (Array.isArray(value)) {
    for (const entry of value) collect(entry, out);
    return;
  }
  if (typeof value === 'object') {
    for (const [className, active] of Object.entries(value as ClassRecord)) {
      if (active) out.push(className);
    }
  }
}

/** Mapa `nombre → clases` para una variante. */
export type VariantMap = Record<string, string>;

export interface VariantConfig<TVariants extends Record<string, VariantMap>> {
  base?: string;
  variants: TVariants;
  defaultVariants?: { [K in keyof TVariants]?: keyof TVariants[K] & string };
}

/** Claves y valores de las variantes declaradas, para que el padre se autocomplete. */
export type VariantProps<TConfig> = TConfig extends VariantConfig<infer TVariants>
  ? { [K in keyof TVariants]?: keyof TVariants[K] & string }
  : never;

export interface VariantFn<TVariants extends Record<string, VariantMap>> {
  (overrides?: { [K in keyof TVariants]?: keyof TVariants[K] & string }, extra?: ClassValue): string;
}

/**
 * Construye un clasificador tipado.
 *
 * ```ts
 * const panel = variants({
 *   base: 'rounded-(--radius-panel) border',
 *   variants: { tone: { default: 'border-(--color-line)', danger: 'border-(--color-danger)' } },
 *   defaultVariants: { tone: 'default' },
 * })
 * panel()                       // 'rounded-(--radius-panel) border border-(--color-line)'
 * panel({ tone: 'danger' }, 'mt-4')
 * ```
 */
export function variants<const TVariants extends Record<string, VariantMap>>(
  config: VariantConfig<TVariants>
): VariantFn<TVariants> {
  const fn = (
    overrides?: { [K in keyof TVariants]?: keyof TVariants[K] & string },
    extra?: ClassValue
  ): string => {
    const classes: string[] = [];
    if (config.base !== undefined) classes.push(config.base);

    for (const [name, map] of Object.entries(config.variants)) {
      const chosen =
        (overrides?.[name as keyof TVariants] as string | undefined) ??
        (config.defaultVariants?.[name as keyof TVariants] as string | undefined);
      if (chosen === undefined) continue;
      const value = map[chosen];
      if (value !== undefined) classes.push(value);
    }

    classes.push(cn(extra ?? null));
    return classes.filter(Boolean).join(' ');
  };

  return fn;
}
