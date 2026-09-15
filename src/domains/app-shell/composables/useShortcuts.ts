import { onScopeDispose } from 'vue';

import { emitDomainEvent } from '@shared/bus/domain-events';
import { SHORTCUTS } from '@config/ui/tokens';
import { navigate } from 'astro:transitions/client';
import { routes } from '@config/routes';
import { useAppShellStore } from '@stores/app-shell';

/**
 * @file src/domains/app-shell/composables/useShortcuts.ts
 * @description Atajos globales del shell.
 *
 * Se registra una sola vez por isla y se limpia con `onScopeDispose`: un listener
 * de teclado huérfano tras la navegación es de las fugas más difíciles de ver en
 * una app con islas.
 *
 * `mod` es Cmd en macOS y Ctrl en el resto; en desktop el menú nativo puede
 * declarar los mismos, y ahí `desktop:shortcut` es el puente (ver
 * `electron/lib/ipc.mjs`).
 */
export function useShortcuts(): void {
  const shell = useAppShellStore();

  const mod = typeof navigator !== 'undefined' && /Mac|iP(hone|od|ad)/.test(navigator.platform) ? 'metaKey' : 'ctrlKey';

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

  document.addEventListener('keydown', onKeydown);
  onScopeDispose(() => document.removeEventListener('keydown', onKeydown));

  // El atajo de detener el stream es local a la isla de chat, no global: Escape
  // dentro de un textarea debe poder cerrarse sin secuestrar la tecla.
  void SHORTCUTS.stopStream;
}
