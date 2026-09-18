/**
 * @file src/domains/chat-studio/composables/useStudioShell.ts
 * @description Estado del chrome del estudio: navegación, panel de contexto,
 * panel de conectores, modelo activo y modal de vista previa.
 *
 * **Dos paneles a la derecha, como mucho.** El de contexto pertenece a la
 * conversación (archivos, fuentes citadas) y el de conectores es un espacio de
 * trabajo; son estados independientes porque cerrar uno no tiene por qué cerrar el
 * otro. La fila los coloca —el de contexto pegado al chat, conectores en el borde
 * exterior— y el CSS decide cuándo el segundo se superpone en vez de empujar.
 *
 * **Por qué `provide`/`inject` y no un store de Pinia.** El estudio entero es
 * **una sola isla** (`client:only` en `AppLayout`), así que su estado no cruza
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

import type { ConnectorTab } from '@domains/connectors';
import { routes } from '@config/routes';
import { useAppShellStore } from '@stores/app-shell';
import { DEFAULT_STUDIO_MODEL, STUDIO_COPY } from '../data/studio.seed';
import type { PanelTab, ResourceRow, SourceScope, StudioModel } from '../types/studio.types';

export interface StudioShellOptions {
  /**
   * "Nuevo chat": limpia la conversación en curso y devuelve el **hilo nuevo** al
   * que hay que navegar. Vive en la raíz del estudio porque es ella quien conoce
   * al motor del chat y a las sesiones; el shell solo sabe de chrome.
   */
  onNewChat?: (() => string) | undefined;
}

export interface StudioShell {
  /** Rail visible en escritorio. Persistido por el store del shell. */
  railOpen: ComputedRef<boolean>;
  /** Etiqueta del botón del rail, para `aria-label` y `title`. */
  railLabel: ComputedRef<string>;
  /** Cajón lateral en móvil. Estado propio: arranca cerrado en cada carga. */
  drawerOpen: Ref<boolean>;
  contextOpen: Ref<boolean>;
  /**
   * Panel de conectores, a la derecha del de contexto. Son **dos** estados
   * distintos porque son dos paneles distintos: el de contexto es de la
   * conversación y el otro es un espacio de trabajo, así que se abren y se cierran
   * por su cuenta (**como mucho, dos a la vez**).
   */
  connectorsOpen: Ref<boolean>;
  /** Sección con la que abre el panel de conectores. */
  connectorsTab: Ref<ConnectorTab>;
  tab: Ref<PanelTab>;
  scope: Ref<SourceScope>;
  model: Ref<StudioModel>;
  preview: Ref<ResourceRow | null>;
  toggleRail: () => void;
  openNav: () => void;
  closeNav: () => void;
  toggleContext: (open?: boolean) => void;
  openConnectors: (tab?: ConnectorTab) => void;
  setConnectorsTab: (tab: ConnectorTab) => void;
  closeConnectors: () => void;
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
  const connectorsOpen = ref(false);
  const connectorsTab = ref<ConnectorTab>('fuentes');
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

  /**
   * Abrir el panel **trae la sección pedida**: se entra desde sitios distintos
   * —la franja del composer, el rail, las herramientas—, así que la pestaña la
   * decide quien abre y no el panel, que no sabe por qué lo llaman.
   */
  function openConnectors(tab?: ConnectorTab): void {
    if (tab !== undefined) connectorsTab.value = tab;
    connectorsOpen.value = true;
  }

  /**
   * Lo que emite el propio panel al cambiar de sección. Se guarda aunque el panel
   * esté abierto para que, si se cierra y se vuelve a abrir desde el rail, la
   * sección se recuerde; el rail siempre entra diciendo la suya.
   */
  function setConnectorsTab(tab: ConnectorTab): void {
    connectorsTab.value = tab;
  }

  function closeConnectors(): void {
    connectorsOpen.value = false;
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

  /**
   * "Nuevo chat" **crea una sesión** (ver `useStudioSessions`) y navega a su hilo;
   * la raíz del estudio es quien la crea y devuelve la ruta. Sin ese callback se
   * cae a la raíz, que es el estado vacío de siempre.
   *
   * El panel de conectores **no** se cierra: no es estado de la conversación, y
   * quien estuviera copiando una credencial no espera perderla por empezar un chat.
   */
  function newChat(): void {
    closeNav();
    closePreview();
    contextOpen.value = false;
    // No se espera: la navegación la gestiona el ClientRouter y el estado del
    // estudio ya está resuelto. `void` deja explícito que el descarte es a
    // propósito, que es lo que un `async` sin `await` escondería.
    void navigate(options.onNewChat?.() ?? routes.home());
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
    connectorsOpen,
    connectorsTab,
    tab,
    scope,
    model,
    preview,
    toggleRail,
    openNav,
    closeNav,
    toggleContext,
    openConnectors,
    setConnectorsTab,
    closeConnectors,
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
