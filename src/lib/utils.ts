/**
 * @file src/lib/utils.ts
 * @description `cn` canónico de shadcn-vue: `clsx` + `tailwind-merge`.
 *
 * Coexisten a propósito dos clasificadores, cada uno con su territorio:
 *  - Este (`@/lib/utils`): SOLO para los componentes generados de
 *    `src/components/ui/**`. `twMerge` resuelve conflictos de utilidades
 *    (`px-2` vs `px-4`) porque las variantes de shadcn se componen con CVA y
 *    las clases las decide el registry, no este repo.
 *  - `@shared/ui/variants` (`cn` + `variants`): el resto del repo, incluido el
 *    frontmatter de `.astro`, donde CVA no llega. Ver `AGENTS.md` raíz.
 *
 * No unificarlos: el `cn` de `variants.ts` concatena sin merge, y los tests de
 * `tests/shared/variants.spec.ts` fijan esa semántica.
 */
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
