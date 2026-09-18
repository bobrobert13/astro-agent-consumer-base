/**
 * @file src/domains/connectors/composables/useConnectors.ts
 * @description Estado de la vista de conectores: pestaña activa, filtros, detalle
 * y borrador de configuración.
 *
 * **Por qué `provide`/`inject` y no un store de Pinia.** La vista entera es **una
 * sola isla** (`client:only` en `pages/conectores.astro`), así que su estado no
 * cruza ninguna frontera: un store aquí sería un singleton global para un estado
 * que vive y muere con el componente. Es el mismo trato que hace el estudio con
 * `useStudioShell`, y la razón es la misma.
 *
 * **Dos verdades, a propósito.** El catálogo (`connectors`) y el **borrador** del
 * modal (`editing`) son estados distintos: el modal clona el conector al abrirse y
 * solo lo devuelve al catálogo al guardar. Sin esa separación, cerrar el modal con
 * la cruz dejaría los cambios aplicados y no habría forma de cancelar.
 *
 * **El detalle se guarda por id, no por objeto.** Guardar la referencia dejaría el
 * panel señalando a un conector que ya no está en el catálogo en cuanto se guarda
 * una configuración; con el id, lo que se pinta siempre sale de la lista viva.
 */
import { computed, inject, provide, onScopeDispose, ref, type ComputedRef, type InjectionKey, type Ref } from 'vue';

import { CONNECTORS, CONNECTOR_COPY, KNOWLEDGE_BASES, TEMPLATES } from '../data/connectors.seed';
import type { Connector, ConnectorFilter, ConnectorTab } from '../types/connector.types';

export interface ConnectorsShellOptions {
  /** Pestaña con la que abre, resuelta del `?pestana=` en `pages/conectores.astro`. */
  initialTab?: ConnectorTab | undefined;
}

export interface ConnectorsShell {
  /** Pestaña activa. Es el `?pestana=` de la URL. */
  tab: Ref<ConnectorTab>;
  filter: Ref<ConnectorFilter>;
  query: Ref<string>;
  /** Conector cuyo detalle está abierto, si hay alguno. */
  detail: ComputedRef<Connector | null>;
  /** Borrador del modal de configuración; `null` cuando está cerrado. */
  editing: Ref<Connector | null>;
  /** Simulacro de lectura del catálogo en curso. */
  loading: Ref<boolean>;
  connectors: Ref<Connector[]>;
  /** El catálogo tras aplicar estado y búsqueda. */
  visible: ComputedRef<Connector[]>;
  /** Contador de cada pestaña, para la barra. */
  counts: ComputedRef<Record<ConnectorTab, number>>;
  /** Conectores que no están sanos: alimenta el aviso de la cabecera. */
  troubled: ComputedRef<number>;
  setTab: (tab: ConnectorTab) => void;
  setFilter: (filter: ConnectorFilter) => void;
  setQuery: (query: string) => void;
  clearFilters: () => void;
  openDetail: (id: string) => void;
  closeDetail: () => void;
  openConfig: (connector: Connector) => void;
  closeConfig: () => void;
  saveConfig: () => void;
  refresh: () => void;
  /** Aviso para las acciones que todavía son esqueleto. */
  notYet: (label: string) => void;
}

const CONNECTORS_SHELL: InjectionKey<ConnectorsShell> = Symbol('connectors/shell');

/**
 * Lo que tarda el simulacro de lectura. No es una espera fingida: el botón
 * "Actualizar" existe para que el estado de carga se pueda evaluar de verdad, y el
 * día que haya servicio real este temporizador se sustituye por la llamada, sin
 * tocar la vista.
 */
const REFRESH_MS = 900;

/**
 * Copia profunda hasta donde llega el dato (campos y ámbitos). `structuredClone`
 * existe en el navegador, pero no en todos los entornos de test, y aquí el clon es
 * de dos niveles: explicitarlo es más barato que descubrir el hueco en jsdom.
 */
function cloneConnector(connector: Connector): Connector {
  return {
    ...connector,
    fields: connector.fields.map((field) => ({ ...field })),
    scopes: connector.scopes.map((scope) => ({ ...scope })),
  };
}

/**
 * Se llama **una vez**, en la raíz de la vista. Los descendientes usan
 * `useConnectors()`, que falla fuerte si falta el `provide`: un estado
 * silenciosamente `undefined` se manifiesta como una lista vacía sin motivo, y eso
 * cuesta más de encontrar que un error de arranque.
 */
export function provideConnectors(options: ConnectorsShellOptions = {}): ConnectorsShell {
  const tab = ref<ConnectorTab>(options.initialTab ?? 'fuentes');
  const filter = ref<ConnectorFilter>('all');
  const query = ref('');
  const detailId = ref<string | null>(null);
  const editing = ref<Connector | null>(null);
  const loading = ref(false);
  const connectors = ref<Connector[]>(CONNECTORS.map(cloneConnector));

  const detail = computed(() => connectors.value.find((item) => item.id === detailId.value) ?? null);

  const visible = computed(() => {
    const needle = query.value.trim().toLowerCase();
    return connectors.value.filter((connector) => {
      const matchesFilter = filter.value === 'all' || connector.status === filter.value;
      if (!matchesFilter) return false;
      if (needle === '') return true;
      return `${connector.name} ${connector.provider}`.toLowerCase().includes(needle);
    });
  });

  const counts = computed<Record<ConnectorTab, number>>(() => ({
    fuentes: connectors.value.length,
    conocimiento: KNOWLEDGE_BASES.length,
    plantillas: TEMPLATES.length,
  }));

  const troubled = computed(
    () => connectors.value.filter((connector) => connector.status === 'error' || connector.status === 'pending').length
  );

  function setTab(next: ConnectorTab): void {
    tab.value = next;
  }

  function setFilter(next: ConnectorFilter): void {
    filter.value = next;
  }

  function setQuery(next: string): void {
    query.value = next;
  }

  function clearFilters(): void {
    filter.value = 'all';
    query.value = '';
  }

  function openDetail(id: string): void {
    detailId.value = id;
  }

  function closeDetail(): void {
    detailId.value = null;
  }

  function openConfig(connector: Connector): void {
    editing.value = cloneConnector(connector);
  }

  function closeConfig(): void {
    editing.value = null;
  }

  /** Devuelve el borrador al catálogo; es el único punto donde se escribe encima. */
  function saveConfig(): void {
    const draft = editing.value;
    if (draft === null) return;

    connectors.value = connectors.value.map((connector) => (connector.id === draft.id ? draft : connector));
    editing.value = null;
    void notify(CONNECTOR_COPY.saved, true);
  }

  let timer: ReturnType<typeof setTimeout> | undefined;

  /**
   * Simulacro de lectura del catálogo. Deja el estado de carga en pantalla el
   * tiempo justo para poder mirarlo y refresca la marca de tiempo de lo que sí está
   * conectado; lo que está pendiente o roto se queda como está, que es lo honesto:
   * leer no arregla una credencial.
   */
  function refresh(): void {
    loading.value = true;
    timer = setTimeout(() => {
      loading.value = false;
      connectors.value = connectors.value.map((connector) =>
        connector.status === 'connected' ? { ...connector, lastSync: 'hace un momento' } : connector
      );
    }, REFRESH_MS);
  }

  onScopeDispose(() => {
    if (timer !== undefined) clearTimeout(timer);
  });

  function notYet(label: string): void {
    void notify(label);
  }

  /**
   * `vue-sonner` entra por `import()` al primer aviso y no en el arranque: son
   * ~20 KB que no hacen falta para ver la vista. Es el mismo trato que hace el
   * estudio, y dentro de un componente ya hidratado, así que no exige nada nuevo.
   */
  async function notify(message: string, success = false): Promise<void> {
    const { toast } = await import('vue-sonner');
    if (success) toast.success(message);
    else toast(message, { description: CONNECTOR_COPY.notYetBody });
  }

  const shell: ConnectorsShell = {
    tab,
    filter,
    query,
    detail,
    editing,
    loading,
    connectors,
    visible,
    counts,
    troubled,
    setTab,
    setFilter,
    setQuery,
    clearFilters,
    openDetail,
    closeDetail,
    openConfig,
    closeConfig,
    saveConfig,
    refresh,
    notYet,
  };

  provide(CONNECTORS_SHELL, shell);
  return shell;
}

export function useConnectors(): ConnectorsShell {
  const shell = inject(CONNECTORS_SHELL);
  if (shell === undefined) {
    throw new Error('useConnectors() se usó fuera de la vista: falta provideConnectors().');
  }
  return shell;
}
