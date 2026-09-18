/**
 * @file src/domains/connectors/composables/useConnectors.ts
 * @description Estado del panel de conectores: pestaña activa, filtros, detalle y
 * los dos borradores (configurar y añadir).
 *
 * **Por qué `provide`/`inject` y no un store de Pinia.** El panel entero es **una
 * sola isla** —la del estudio—, así que su estado no cruza ninguna frontera: un
 * store aquí sería un singleton global para un estado que vive y muere con el
 * componente. Es el mismo trato que hace el estudio con `useStudioShell`.
 *
 * **Quién abre el panel no está aquí.** Vivir dentro del estudio es
 * `useStudioShell`; esto solo sabe de lo que hay dentro, y por eso el panel se
 * puede montar en un test sin el estudio entero.
 *
 * **Tres verdades distintas, a propósito.** El catálogo (`connectors`) es lo
 * guardado; `editing` y `adding` son **borradores** clonados o construidos desde
 * una plantilla, y solo sus `save*` los devuelven al catálogo. Sin esa separación,
 * cerrar un modal con la cruz dejaría los cambios aplicados y no habría forma de
 * cancelar.
 *
 * **El detalle se guarda por id, no por objeto.** Guardar la referencia dejaría el
 * panel señalando a un conector que ya no está en el catálogo en cuanto se guarda
 * una configuración; con el id, lo que se pinta siempre sale de la lista viva.
 */
import { computed, inject, onScopeDispose, provide, ref, type ComputedRef, type InjectionKey, type Ref } from 'vue';

import {
  CONNECTORS,
  CONNECTOR_COPY,
  CONNECTOR_TABS,
  CONNECTOR_TEMPLATES,
  KNOWLEDGE_BASES,
  TEMPLATES,
} from '../data/connectors.seed';
import type {
  Connector,
  ConnectorFilter,
  ConnectorKind,
  ConnectorTab,
  ConnectorTabItem,
} from '../types/connector.types';

export interface ConnectorsShell {
  /** Pestaña activa del panel. */
  tab: Ref<ConnectorTab>;
  filter: Ref<ConnectorFilter>;
  query: Ref<string>;
  /** Conector cuyo detalle está abierto, si hay alguno. */
  detail: ComputedRef<Connector | null>;
  /** Borrador del modal de configuración; `null` cuando está cerrado. */
  editing: Ref<Connector | null>;
  /** Borrador del asistente de alta; `null` cuando está cerrado. */
  adding: Ref<Connector | null>;
  /** Simulacro de lectura del catálogo en curso. */
  loading: Ref<boolean>;
  connectors: Ref<Connector[]>;
  /** El catálogo tras aplicar estado y búsqueda. */
  visible: ComputedRef<Connector[]>;
  /** Contador de cada pestaña, para la barra y la cabecera. */
  counts: ComputedRef<Record<ConnectorTab, number>>;
  /** La pestaña activa con su etiqueta y su glifo, para la cabecera del panel. */
  activeTab: ComputedRef<ConnectorTabItem>;
  /** Conectores que no están sanos: alimenta el aviso del listado. */
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
  openAdd: () => void;
  closeAdd: () => void;
  setAddingKind: (kind: ConnectorKind) => void;
  saveAdd: () => void;
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

/** Contador para que dos altas del mismo milisegundo no compartan id. */
let sequence = 0;

/**
 * Un conector recién creado. Arranca de la plantilla de su familia —el formulario
 * en blanco de ese tipo— y **sin autorizar**: no hay credenciales verificadas, así
 * que decir "conectado" sería mentir. Es el estado que estrena `pending`.
 */
function draftFrom(kind: ConnectorKind): Connector {
  const template = CONNECTOR_TEMPLATES[kind];
  sequence += 1;

  return {
    id: `nuevo-${Date.now().toString(36)}-${sequence.toString(36)}`,
    name: template.name,
    provider: template.provider,
    description: template.description,
    kind,
    status: 'pending',
    statusNote: 'Falta autorizar la conexión',
    documents: 0,
    lastSync: 'Nunca',
    fields: template.fields.map((field) => ({ ...field })),
    scopes: template.scopes.map((scope) => ({ ...scope })),
  };
}

/**
 * Se llama **una vez**, en la raíz del panel. Los descendientes usan
 * `useConnectors()`, que falla fuerte si falta el `provide`: un estado
 * silenciosamente `undefined` se manifiesta como una lista vacía sin motivo, y eso
 * cuesta más de encontrar que un error de arranque.
 */
export function provideConnectors(): ConnectorsShell {
  const tab = ref<ConnectorTab>('fuentes');
  const filter = ref<ConnectorFilter>('all');
  const query = ref('');
  const detailId = ref<string | null>(null);
  const editing = ref<Connector | null>(null);
  const adding = ref<Connector | null>(null);
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

  const activeTab = computed<ConnectorTabItem>(() => {
    const item = CONNECTOR_TABS.find((entry) => entry.id === tab.value);
    if (item === undefined) throw new Error(`pestaña sin definición en la semilla: ${tab.value}`);
    return item;
  });

  const troubled = computed(
    () => connectors.value.filter((connector) => connector.status === 'error' || connector.status === 'pending').length
  );

  /**
   * Cambiar de sección cierra el detalle: dejarlo abierto al volver a "Conectores"
   * haría reaparecer una ficha que ya no se estaba mirando, y el panel se lee de un
   * vistazo, no de memoria.
   */
  function setTab(next: ConnectorTab): void {
    tab.value = next;
    detailId.value = null;
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

  /**
   * Devuelve el borrador al catálogo; es el único punto donde se escribe encima.
   *
   * El estado **no** cambia al guardar: rellenar una credencial no demuestra que la
   * conexión funcione, y este esqueleto no puede comprobarlo. Una fuente con error
   * sigue con error hasta que exista una sincronización de verdad que lo diga.
   */
  function saveConfig(): void {
    const draft = editing.value;
    if (draft === null) return;

    connectors.value = connectors.value.map((connector) => (connector.id === draft.id ? draft : connector));
    editing.value = null;
    void notify(CONNECTOR_COPY.saved, true);
  }

  function openAdd(): void {
    adding.value = draftFrom('database');
  }

  function closeAdd(): void {
    adding.value = null;
  }

  /**
   * Cambiar de familia **reconstruye** el borrador desde su plantilla: cada tipo
   * tiene sus campos y sus permisos, y arrastrar los de la familia anterior dejaría
   * un formulario que no le corresponde. Como el asistente es lineal, la familia se
   * elige antes de tocar ningún campo.
   */
  function setAddingKind(kind: ConnectorKind): void {
    adding.value = draftFrom(kind);
  }

  /**
   * El alta entra por delante —es lo último que ha pasado— y el panel salta a
   * "Conectores" para que se vea: crear algo que no aparece donde estás mirando se
   * lee como que no se creó.
   */
  function saveAdd(): void {
    const draft = adding.value;
    if (draft === null) return;

    connectors.value = [draft, ...connectors.value];
    adding.value = null;
    setTab('fuentes');
    void notify(CONNECTOR_COPY.created, true);
  }

  let timer: ReturnType<typeof setTimeout> | undefined;

  /**
   * Simulacro de lectura del catálogo. Deja el estado de carga en pantalla el
   * tiempo justo para poder mirarlo y refresca la marca de tiempo de lo que sí está
   * conectado; lo que está con error o sin conectar se queda como está, que es lo
   * honesto: leer no arregla una credencial.
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
   * ~20 KB que no hacen falta para ver el panel. Es el mismo trato que hace el
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
    adding,
    loading,
    connectors,
    visible,
    counts,
    activeTab,
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
    openAdd,
    closeAdd,
    setAddingKind,
    saveAdd,
    refresh,
    notYet,
  };

  provide(CONNECTORS_SHELL, shell);
  return shell;
}

export function useConnectors(): ConnectorsShell {
  const shell = inject(CONNECTORS_SHELL);
  if (shell === undefined) {
    throw new Error('useConnectors() se usó fuera del panel: falta provideConnectors().');
  }
  return shell;
}
