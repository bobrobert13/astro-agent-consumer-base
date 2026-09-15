import { onMounted, onScopeDispose } from 'vue';

import { emitDomainEvent } from '@shared/bus/domain-events';
import { navigate } from 'astro:transitions/client';
import { routes } from '@config/routes';
import { useAppShellStore } from '@stores/app-shell';

/**
 * @file src/domains/app-shell/composables/useShortcuts.ts
 * @description Atajos globales del shell.
 *
 * Lo monta la isla `ShellShortcuts` (AppLayout, `client:only`): sin esa isla los
 * atajos que /settings anuncia no existirían. El listener se registra en
 * `onMounted` y se limpia con `onScopeDispose`: un listener de teclado huérfano
 * tras la navegación es de las fugas más difíciles de ver en una app con islas.
 *
 * `mod` es Cmd en macOS y Ctrl en el resto; en desktop el menú nativo puede
 * declarar los mismos, y ahí `desktop:shortcut` es el puente (ver
 * `electron/lib/ipc.mjs`).
 *
 * El atajo de detener el stream (`SHORTCUTS.stopStream`, Escape) es local a la
 * isla de chat, no global: vive en `ChatIsland.vue` para no secuestrar la tecla
 * fuera de una ejecución.
 */
export function useShortcuts(): void {
  const shell = useAppShellStore();

  // `navigator.platform` está deprecado; el user-agent sigue siendo la vía
  // portable de detectar macOS/iOS (userAgentData solo existe en Chromium).
  const mod = typeof navigator !== 'undefined' && /Mac|iP(hone|od|ad)/.test(navigator.userAgent) ? 'metaKey' : 'ctrlKey';

  function onKeydown(event: KeyboardEvent): void {
    if (event.isComposing) return;
    const meta = event[mod as 'metaKey' | 'ctrlKey'];
    if (!meta) return;

    const key = event.key.toLowerCase();

    if (key === ',') {
      event.preventDefault();
      navigate(routes.settings());
      return;
    }
    if (key === 'k' && !event.shiftKey) {
      event.preventDefault();
      navigate(routes.chat());
      return;
    }
    if (key === 'b' && event.shiftKey) {
      event.preventDefault();
      shell.toggleSidebar();
      return;
    }

    emitDomainEvent('desktop:shortcut', { id: `${mod}+${key}` });
  }

  onMounted(() => document.addEventListener('keydown', onKeydown));
  onScopeDispose(() => document.removeEventListener('keydown', onKeydown));
}
