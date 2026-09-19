/**
 * @file src/domains/chat-studio/composables/useStudioShell.ts
 * @description Estado del chrome del estudio: navegación, panel de contexto, panel
 * de espacios (conectores, configuración), modelo activo y modal de vista previa.
 *
 * **Dos paneles a la derecha, como mucho.** El de contexto pertenece a la
 * conversación (archivos, fuentes citadas) y el de espacios es un espacio de trabajo
 * con dos contenidos posibles —conectores o configuración—, de los que cabe **uno**:
 * abrir el otro cambia lo que se ve, no apila. La fila los coloca —el de contexto
 * pegado al chat, el de espacios en el borde exterior— y el CSS decide cuándo el
 * segundo se superpone en vez de empujar.
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
import { DEFAULT_STUDIO_MODEL } from '../data/studio.seed';
import type { PanelScope, PanelTab, ResourceRow, SourceScope, StudioModel } from '../types/studio.types';

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
   * Espacio de trabajo abierto en el panel lateral, si hay alguno. Es **uno**: el
   * panel es la columna, y abrir configuración con conectores abiertos cambia su
   * contenido. Son espacios distintos —uno es la conversación hecha panel, el otro
   * una herramienta— y por eso el estado del de contexto es aparte (**como mucho,
   * dos paneles a la derecha**).
   */
  panel: Ref<PanelScope | null>;
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
  openSettings: () => void;
  setConnectorsTab: (tab: ConnectorTab) => void;
  closePanel: () => void;
  setTab: (tab: PanelTab) => void;
  setScope: (scope: SourceScope) => void;
  setModel: (model: StudioModel) => void;
  openPreview: (resource: ResourceRow) => void;
  closePreview: () => void;
  newChat: () => void;
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
  const panel = ref<PanelScope | null>(null);
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
   * Abrir el panel **trae el espacio pedido**: se entra desde sitios distintos —la
   * franja del composer, el rail, las herramientas, el pie—, así que decide quien
   * abre y no el panel, que no sabe por qué lo llaman. Abrir un espacio con otro
   * abierto lo **sustituye**: el panel es la columna, no una pila.
   */
  function openConnectors(tab?: ConnectorTab): void {
    if (tab !== undefined) connectorsTab.value = tab;
    panel.value = 'conectores';
  }

  function openSettings(): void {
    panel.value = 'configuracion';
  }

  /**
   * Lo que emite el propio panel al cambiar de sección. Se guarda aunque el panel
   * esté abierto para que, al reabrirlo desde el rail, la sección se recuerde; el
   * rail siempre entra diciendo la suya.
   */
  function setConnectorsTab(tab: ConnectorTab): void {
    connectorsTab.value = tab;
  }

  function closePanel(): void {
    panel.value = null;
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

  const shell: StudioShell = {
    railOpen,
    railLabel,
    drawerOpen,
    contextOpen,
    panel,
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
    openSettings,
    setConnectorsTab,
    closePanel,
    setTab,
    setScope,
    setModel,
    openPreview,
    closePreview,
    newChat,
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
