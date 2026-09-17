/**
 * @file src/domains/chat-studio/composables/useStudioShortcuts.ts
 * @description Atajos de teclado del estudio. Los monta **una sola vez** la raíz
 * de la isla, que es la única que ve el composer y el estado del chrome.
 *
 * Sustituye a `useShortcuts` de `app-shell` en esta pantalla: como el estudio ya
 * es una isla única que vive en todas las rutas del producto, tener los atajos en
 * una segunda isla hermana solo servía para que las dos reaccionaran a la misma
 * tecla. `app-shell` conserva lo que sí es suyo (progreso de navegación y store).
 */
import { onMounted, onScopeDispose } from 'vue';

import { useStudioShell } from './useStudioShell';

/** ¿El evento nace dentro de un campo donde se escribe? */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.isContentEditable
  );
}

export function useStudioShortcuts(): void {
  const shell = useStudioShell();

  // `navigator.platform` está deprecado; el user-agent sigue siendo la vía
  // portable de detectar macOS/iOS (userAgentData solo existe en Chromium).
  const mod =
    typeof navigator !== 'undefined' && /Mac|iP(hone|od|ad)/.test(navigator.userAgent)
      ? 'metaKey'
      : 'ctrlKey';

  function onKeydown(event: KeyboardEvent): void {
    if (event.isComposing) return;

    const meta = event[mod as 'metaKey' | 'ctrlKey'];
    const key = event.key.toLowerCase();

    // `⌘N` / `Ctrl+N`: el navegador lo reserva para una ventana nueva.
    if (meta && key === 'n') {
      event.preventDefault();
      void shell.newChat();
      return;
    }

    // `⌘⇧B` / `Ctrl+Shift+B`: contraer o expandir el rail.
    if (meta && event.shiftKey && key === 'b') {
      event.preventDefault();
      shell.toggleRail();
      return;
    }

    // `Escape` cierra el cajón: es la única capa propia que no gestiona reka-ui.
    if (key === 'escape' && shell.drawerOpen.value) {
      shell.closeNav();
      return;
    }

    // `/` enfoca el composer, como en la plantilla, pero nunca mientras se
    // escribe: ahí la barra es un carácter, no un atajo.
    if (!meta && key === '/' && !isTypingTarget(event.target)) {
      const composer = document.getElementById('aac-composer');
      if (composer instanceof HTMLTextAreaElement) {
        event.preventDefault();
        composer.focus();
      }
    }
  }

  onMounted(() => document.addEventListener('keydown', onKeydown));
  onScopeDispose(() => document.removeEventListener('keydown', onKeydown));
}
