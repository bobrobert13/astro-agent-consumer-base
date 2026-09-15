import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { STORAGE_KEYS } from '@config/ui/tokens';

/**
 * @file src/stores/app-shell.ts
 * @description El único store global del boilerplate, y el ejemplo de cuándo
 * Pinia gana a un composable compartido.
 *
 * Cumple los tres disparadores de `AGENTS.md` a la vez:
 *  - lo leen/escriben varias islas (sidebar, atajos, cabecera);
 *  - debe sobrevivir a la navegación entre páginas, donde `transition:persist`
 *    no aplica porque la isla de cada página es distinta;
 *  - y conviene verlo en devtools durante una sesión larga de depuración.
 *
 * Solo estado de interfaz. Los datos de dominio viven en su slice, y lo que se
 * comparte por URL no se duplica aquí.
 */
export type ShellTheme = 'system' | 'light' | 'dark';

export const useAppShellStore = defineStore('app-shell', () => {
  const sidebarOpen = ref(true);
  const theme = ref<ShellTheme>('system');

  /** Isla activa que quiere notificar algo al chrome de la app. */
  const busy = ref(false);

  const sidebarLabel = computed(() => (sidebarOpen.value ? 'Cerrar navegación' : 'Abrir navegación'));

  function toggleSidebar(): void {
    sidebarOpen.value = !sidebarOpen.value;
    remember(STORAGE_KEYS.sidebarOpen, String(sidebarOpen.value));
  }

  function setTheme(next: ShellTheme): void {
    theme.value = next;
    remember(STORAGE_KEYS.theme, next);
    applyThemeClasses(next);
  }

  /**
   * Hidratación al crear el store: sin esto, el tema y el sidebar persistidos
   * morían en cada recarga (se guardaban para nadie). Falla en silencio con
   * almacenamiento bloqueado o ausente — perder la preferencia no debe romper
   * la app, igual que en `remember`.
   */
  function restore(): void {
    try {
      const savedTheme = localStorage.getItem(STORAGE_KEYS.theme);
      if (savedTheme === 'system' || savedTheme === 'light' || savedTheme === 'dark') theme.value = savedTheme;
      const savedSidebar = localStorage.getItem(STORAGE_KEYS.sidebarOpen);
      if (savedSidebar !== null) sidebarOpen.value = savedSidebar !== 'false';
    } catch {
      /* almacenamiento no disponible: se mantienen los defaults */
    }
    applyThemeClasses(theme.value);
  }

  restore();

  return { sidebarOpen, theme, busy, sidebarLabel, toggleSidebar, setTheme };
});

/**
 * `system` no toca clases: deja mandar a la media query de `global.css`. La
 * variante `dark` de Tailwind y las variables `--aac-*` cubren los dos caminos
 * (clase y media), así que forzar tema y seguir al sistema conviven.
 */
function applyThemeClasses(theme: ShellTheme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.classList.toggle('light', theme === 'light');
}

/**
 * Persistencia mínima sin dependencia: solo claves nuestras y solo lo que no es
 * dato. `remember` atrapa el fallo de `localStorage` (modo privado, Electron con
 * almacenamiento bloqueado) porque perder la preferencia no debe romper la app.
 */
function remember(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* preferencia no persistible: se ignora en silencio, a propósito */
  }
}
