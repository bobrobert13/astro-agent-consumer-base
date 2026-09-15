/**
 * @file tests/stores/app-shell.spec.ts
 * @description El store global se prueba con `setActivePinia`, que es la vía
 * oficial de Pinia para usar stores fuera de un componente.
 *
 * Que este archivo exista no autoriza a usar `setActivePinia` en la app: en la UI
 * real el pinia lo instala `src/vue-app.ts` en cada isla. Aquí solo se necesita un
 * pinia activo para ejercitar la store aislada.
 */
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAppShellStore } from '@stores/app-shell';

beforeEach(() => {
  setActivePinia(createPinia());
  const storage = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => void storage.set(key, value),
    removeItem: (key: string) => void storage.delete(key),
  });
  vi.stubGlobal('document', { documentElement: { classList: { toggle: vi.fn() } } });
});

describe('useAppShellStore', () => {
  it('alterna el sidebar y persiste la preferencia', () => {
    const shell = useAppShellStore();
    expect(shell.sidebarOpen).toBe(true);

    shell.toggleSidebar();
    expect(shell.sidebarOpen).toBe(false);
    expect(shell.sidebarLabel).toBe('Abrir navegación');
    expect(localStorage.getItem('aac.sidebar')).toBe('false');
  });

  it('aplica el tema tocando la clase del documento', () => {
    const shell = useAppShellStore();
    shell.setTheme('dark');

    expect(shell.theme).toBe('dark');
    expect(localStorage.getItem('aac.theme')).toBe('dark');
  });

  it('dos consumidores del mismo pinia ven el mismo estado', () => {
    const first = useAppShellStore();
    const second = useAppShellStore();

    first.busy = true;
    expect(second.busy).toBe(true);
  });

  it('restaura el tema y el sidebar persistidos al crear el store', () => {
    localStorage.setItem('aac.theme', 'dark');
    localStorage.setItem('aac.sidebar', 'false');

    const shell = useAppShellStore();
    expect(shell.theme).toBe('dark');
    expect(shell.sidebarOpen).toBe(false);
    expect(document.documentElement.classList.toggle).toHaveBeenCalledWith('dark', true);
  });

  it('un valor guardado inválido no altera los defaults', () => {
    localStorage.setItem('aac.theme', 'neón');

    const shell = useAppShellStore();
    expect(shell.theme).toBe('system');
    expect(shell.sidebarOpen).toBe(true);
  });

  it('no rompe si localStorage está bloqueado', () => {
    vi.stubGlobal('localStorage', {
      setItem: () => {
        throw new Error('SecurityError');
      },
    });

    const shell = useAppShellStore();
    expect(() => shell.toggleSidebar()).not.toThrow();
    expect(shell.sidebarOpen).toBe(false);
  });
});
