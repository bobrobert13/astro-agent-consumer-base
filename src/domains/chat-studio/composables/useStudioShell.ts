/**
 * @file src/domains/chat-studio/composables/useStudioShell.ts
 * @description Estado del chrome del estudio: navegación, panel de contexto,
 * modelo activo y modal de vista previa.
 *
 * **Por qué `provide`/`inject` y no un store de Pinia.** El estudio entero es
 * **una sola isla** (`client:only` en `StudioLayout`), así que su estado no cruza
 * ninguna frontera de isla: no hay nada que compartir por módulo. Un store aquí
 * sería un singleton global para un estado que vive y muere con el componente, y
 * el repositorio reserva Pinia para lo que sí cruza islas (`AGENTS.md`).
 *
 * Lo que **sí** es global se queda donde estaba: el rail y el tema son del store
 * `@stores/app-shell`, porque los comparte el chrome de toda la app. Este
 * composable los lee, no los duplica.
 */
import { computed, inject, provide, ref, type ComputedRef, type InjectionKey, type Ref } from 'vue';

import { navigate } from 'astro:transitions/client';

import { routes } from '@config/routes';
import { useAppShellStore } from '@stores/app-shell';
import { DEFAULT_STUDIO_MODEL, STUDIO_COPY } from '../data/studio.seed';
import type { PanelTab, ResourceRow, SourceScope, StudioModel } from '../types/studio.types';

export interface StudioShellOptions {
  /**
   * Limpia la conversación en curso. Lo aporta la raíz del estudio cuando el chat
   * está montado; sin él, "nuevo chat" solo navega.
   */
  onNewChat?: (() => void) | undefined;
}

export interface StudioShell {
  /** Rail visible en escritorio. Persistido por el store del shell. */
  railOpen: ComputedRef<boolean>;
  /** Etiqueta del botón del rail, para `aria-label` y `title`. */
  railLabel: ComputedRef<string>;
  /** Cajón lateral en móvil. Estado propio: arranca cerrado en cada carga. */
  drawerOpen: Ref<boolean>;
  contextOpen: Ref<boolean>;
  tab: Ref<PanelTab>;
  scope: Ref<SourceScope>;
  model: Ref<StudioModel>;
  preview: Ref<ResourceRow | null>;
  toggleRail: () => void;
  openNav: () => void;
  closeNav: () => void;
  toggleContext: (open?: boolean) => void;
  setTab: (tab: PanelTab) => void;
  setScope: (scope: SourceScope) => void;
  setModel: (model: StudioModel) => void;
  openPreview: (resource: ResourceRow) => void;
  closePreview: () => void;
  newChat: () => void;
  /** Aviso para las zonas que todavía son esqueleto. */
  notYet: (label: string) => void;
}

const STUDIO_SHELL: InjectionKey<StudioShell> = Symbol('chat-studio/shell');

/**
 * Se llama **una vez**, en la raíz del estudio. Los descendientes usan
 * `useStudioShell()`, que falla fuerte si falta el `provide`: un estado
 * silenciosamente `undefined` se manifiesta como un botón que no hace nada, y eso
 * cuesta más de encontrar que un error de arranque.
 */
export function provideStudioShell(options: StudioShellOptions = {}): StudioShell {
  const appShell = useAppShellStore();

  const drawerOpen = ref(false);
  const contextOpen = ref(false);
  const tab = ref<PanelTab>('recursos');
  const scope = ref<SourceScope>('interaction');
  const model = ref<StudioModel>(DEFAULT_STUDIO_MODEL);
  const preview = ref<ResourceRow | null>(null);

  const railOpen = computed(() => appShell.sidebarOpen);
  const railLabel = computed(() => (railOpen.value ? 'Contraer navegación' : 'Expandir navegación'));

  /**
   * Rail y cajón son dos estados porque su valor inicial no coincide: en
   * escritorio el rail arranca visible (y se recuerda entre sesiones), mientras
   * que en móvil el cajón debe empezar cerrado para no tapar el contenido nada
   * más cargar. Un único booleano no puede cumplir las dos cosas.
   */
  function toggleRail(): void {
    appShell.toggleSidebar();
    drawerOpen.value = appShell.sidebarOpen;
  }

  function openNav(): void {
    drawerOpen.value = true;
    if (!appShell.sidebarOpen) appShell.toggleSidebar();
  }

  function closeNav(): void {
    drawerOpen.value = false;
    if (appShell.sidebarOpen) appShell.toggleSidebar();
  }

  function toggleContext(open?: boolean): void {
    contextOpen.value = open ?? !contextOpen.value;
  }

  function setTab(next: PanelTab): void {
    tab.value = next;
  }

  function setScope(next: SourceScope): void {
    scope.value = next;
  }

  function setModel(next: StudioModel): void {
    model.value = next;
  }

  function openPreview(resource: ResourceRow): void {
    preview.value = resource;
  }

  /**
   * Cierra antes de resolver: dejar el modal abierto sobre una conversación que
   * ya no es la suya es exactamente el estado huérfano que nadie ve venir.
   */
  function closePreview(): void {
    preview.value = null;
  }

  function newChat(): void {
    closeNav();
    closePreview();
    contextOpen.value = false;
    options.onNewChat?.();
    // No se espera: la navegación la gestiona el ClientRouter y el estado del
    // estudio ya está resuelto. `void` deja explícito que el descarte es a
    // propósito, que es lo que un `async` sin `await` escondería.
    void navigate(routes.home());
  }

  /**
   * `vue-sonner` entra por `import()` al primer aviso, no en el arranque del
   * estudio: son ~20 KB que no hacen falta para ver la pantalla, y el grafo
   * inicial de la isla ya carga el AI SDK. Es el mismo trato que hace la tarjeta
   * de configuración, y por eso el `Toaster` de `ChatStudio` también es asíncrono.
   */
  function notYet(label: string): void {
    void notify(label);
  }

  async function notify(label: string): Promise<void> {
    const { toast } = await import('vue-sonner');
    toast(label, { description: STUDIO_COPY.notImplemented });
  }

  const shell: StudioShell = {
    railOpen,
    railLabel,
    drawerOpen,
    contextOpen,
    tab,
    scope,
    model,
    preview,
    toggleRail,
    openNav,
    closeNav,
    toggleContext,
    setTab,
    setScope,
    setModel,
    openPreview,
    closePreview,
    newChat,
    notYet,
  };

  provide(STUDIO_SHELL, shell);
  return shell;
}

export function useStudioShell(): StudioShell {
  const shell = inject(STUDIO_SHELL);
  if (shell === undefined) {
    throw new Error('useStudioShell() se usó fuera del estudio: falta provideStudioShell().');
  }
  return shell;
}
