/**
 * @file src/domains/connectors/data/connectors.seed.ts
 * @description Datos semilla de los conectores y todo su copy, en un solo módulo
 * para que sustituirlos por lecturas reales no obligue a tocar un `.vue`.
 *
 * **Sin marcas, a propósito.** El resto del repositorio usa un tono neutro
 * (`example.com`, "Proveedor de datos") y aquí se mantiene: los conectores son
 * genéricos por familia —base de datos, almacenamiento, código, mensajería,
 * documentos— y no catálogos de producto real. Así la vista se puede evaluar sin
 * que el vertical ni la marca de nadie se cuelen en el boilerplate.
 *
 * **Sin colores.** El estado es un dato (`status`); su variante de color la elige
 * el componente que lo pinta. Un hex aquí tendría que duplicarse para el modo
 * oscuro y el guardián de tokens lo rechaza.
 *
 * **Tres, dos y cuatro.** El catálogo son tres fuentes, dos conjuntos y cuatro
 * plantillas: lo justo para que cada estado y cada filtro tengan algo que enseñar
 * sin convertir el panel en un listado largo. Los tres estados distintos del
 * catálogo (conectado, con error, sin conectar) son los tres filtros, así que
 * ninguno sale vacío por construcción. `pending` no está en la semilla pero sí en
 * el tipo: lo estrena el asistente de alta, que crea la fuente sin autorizar.
 */
import {
  BookOpen,
  Boxes,
  Database,
  GitBranch,
  HardDrive,
  LayoutGrid,
  MessagesSquare,
  NotebookText,
} from '@lucide/vue';

import type {
  Connector,
  ConnectorFilter,
  ConnectorKind,
  ConnectorKindItem,
  ConnectorScope,
  ConnectorStatus,
  ConnectorTab,
  ConnectorTabItem,
  ConnectorTemplate,
  KnowledgeBase,
  TemplateRow,
} from '../types/connector.types';

/** Pestañas del panel, en el orden en que se pintan. */
export const CONNECTOR_TABS: ConnectorTabItem[] = [
  { id: 'fuentes', label: 'Conectores', icon: Boxes },
  { id: 'conocimiento', label: 'Base de conocimiento', icon: BookOpen },
  { id: 'plantillas', label: 'Plantillas', icon: LayoutGrid },
];

/** Unidad del contador de cada pestaña, que la cabecera del panel compone. */
export const CONNECTOR_TAB_UNITS: Record<ConnectorTab, string> = {
  fuentes: 'fuentes',
  conocimiento: 'conjuntos',
  plantillas: 'plantillas',
};

/** Glifo de cada familia, para no repetir el mapa en cada vista. */
export const CONNECTOR_ICONS: Record<ConnectorKind, typeof Database> = {
  database: Database,
  storage: HardDrive,
  code: GitBranch,
  messaging: MessagesSquare,
  docs: NotebookText,
};

/** Familias que ofrece el asistente de alta, con lo que las distingue. */
export const CONNECTOR_KINDS: ConnectorKindItem[] = [
  { id: 'database', label: 'Base de datos', description: 'Tablas y vistas de un motor relacional.' },
  { id: 'storage', label: 'Almacenamiento', description: 'Archivos y objetos de un espacio.' },
  { id: 'code', label: 'Repositorio de código', description: 'Código, cambios e incidencias.' },
  { id: 'messaging', label: 'Mensajería', description: 'Canales y conversaciones del equipo.' },
  { id: 'docs', label: 'Documentos', description: 'Colecciones de documentos y sus comentarios.' },
];

export const CONNECTOR_STATUS_LABELS: Record<ConnectorStatus, string> = {
  connected: 'Conectado',
  pending: 'Pendiente',
  error: 'Con error',
  disconnected: 'Sin conectar',
};

/** Tres filtros: los tres estados que el catálogo puede enseñar. */
export const CONNECTOR_FILTERS: { id: ConnectorFilter; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'connected', label: 'Conectadas' },
  { id: 'error', label: 'Con error' },
];

/**
 * Permisos de una fuente de datos. Es una **función** y no una constante porque
 * los usan dos entradas —el catálogo y la plantilla del asistente— y compartir el
 * array dejaría a un conector nuevo heredando las ediciones del otro.
 */
function databaseScopes(): ConnectorScope[] {
  return [
    { id: 'schema', label: 'Leer el esquema', description: 'Lista tablas, columnas y tipos.', granted: true },
    { id: 'rows', label: 'Leer registros', description: 'Consulta filas de las tablas del esquema.', granted: true },
    {
      id: 'write',
      label: 'Escribir registros',
      description: 'Permite insertar o modificar filas. No recomendado.',
      granted: false,
    },
  ];
}

/** El catálogo: tres fuentes, una por estado. */
export const CONNECTORS: Connector[] = [
  {
    id: 'sql-analitica',
    name: 'Base de datos SQL',
    provider: 'Proveedor de datos',
    description: 'Consulta tablas y vistas de una base relacional desde el chat, sin mover los datos.',
    kind: 'database',
    status: 'connected',
    statusNote: 'Última lectura correcta',
    documents: 12_840,
    lastSync: 'hace 12 min',
    fields: [
      { id: 'host', label: 'Host', type: 'text', value: 'db.example.com', required: true },
      { id: 'database', label: 'Base de datos', type: 'text', value: 'analitica' },
      { id: 'user', label: 'Usuario', type: 'text', value: 'lector' },
      {
        id: 'password',
        label: 'Contraseña',
        type: 'secret',
        value: 'clave-de-ejemplo',
        required: true,
        help: 'Se guarda cifrada y no vuelve a mostrarse completa.',
      },
      { id: 'tls', label: 'Exigir TLS', type: 'switch', value: true, help: 'Rechaza conexiones sin cifrar.' },
    ],
    scopes: databaseScopes(),
  },
  {
    id: 'mensajeria-equipo',
    name: 'Mensajería de equipo',
    provider: 'Proveedor de mensajería',
    description: 'Busca decisiones y conversaciones recientes en los canales del equipo.',
    kind: 'messaging',
    status: 'error',
    statusNote: 'La credencial caducó',
    documents: 860,
    lastSync: 'hace 6 días',
    fields: [
      { id: 'workspace', label: 'Espacio de trabajo', type: 'text', value: 'equipo-producto', required: true },
      {
        id: 'credential',
        label: 'Credencial del bot',
        type: 'secret',
        value: '',
        required: true,
        help: 'El estado con error viene de aquí: hay que renovarla.',
      },
      { id: 'channels', label: 'Canales', type: 'text', value: '#general, #producto', help: 'Separados por comas.' },
      { id: 'postAsBot', label: 'Permitir que escriba', type: 'switch', value: false },
    ],
    scopes: [
      { id: 'history', label: 'Leer historial', description: 'Consulta mensajes de los canales indicados.', granted: true },
      { id: 'files', label: 'Leer archivos adjuntos', description: 'Indexa lo que se comparte en los canales.', granted: false },
      { id: 'post', label: 'Publicar mensajes', description: 'Escribe en los canales como el bot.', granted: false },
    ],
  },
  {
    id: 'documentos-cloud',
    name: 'Documentos en la nube',
    provider: 'Proveedor de documentos',
    description: 'Trabaja sobre las colecciones de documentos de una cuenta.',
    kind: 'docs',
    status: 'disconnected',
    statusNote: 'Sin conectar todavía',
    documents: 0,
    lastSync: 'Nunca',
    fields: [
      {
        id: 'collection',
        label: 'Colección',
        type: 'select',
        value: 'equipo',
        options: [
          { value: 'equipo', label: 'Documentación de equipo' },
          { value: 'producto', label: 'Documentación de producto' },
          { value: 'procesos', label: 'Procesos internos' },
        ],
      },
      { id: 'rootPath', label: 'Ruta raíz', type: 'text', value: '/', placeholder: '/' },
      {
        id: 'account',
        label: 'Cuenta de servicio',
        type: 'secret',
        value: '',
        required: true,
        help: 'Sin cuenta de servicio el conector no puede leer nada.',
      },
      { id: 'interval', label: 'Horas entre sincronizaciones', type: 'number', value: '24' },
    ],
    scopes: [
      { id: 'read', label: 'Leer documentos', description: 'Extrae el texto de la colección.', granted: false },
      { id: 'comments', label: 'Leer comentarios', description: 'Incluye los hilos de comentarios.', granted: false },
      { id: 'share', label: 'Compartir', description: 'Publica enlaces de los documentos.', granted: false },
    ],
  },
];

/**
 * De dónde arranca una fuente nueva, por familia: nombre, proveedor y los campos
 * y permisos imprescindibles. No es una copia del catálogo —esos ya están
 * configurados y traen sus valores—, sino el formulario en blanco de cada tipo.
 */
export const CONNECTOR_TEMPLATES: Record<ConnectorKind, ConnectorTemplate> = {
  database: {
    name: 'Base de datos SQL',
    provider: 'Proveedor de datos',
    description: 'Consulta tablas y vistas de una base relacional desde el chat.',
    fields: [
      { id: 'host', label: 'Host', type: 'text', value: '', required: true, placeholder: 'db.example.com' },
      { id: 'database', label: 'Base de datos', type: 'text', value: '', placeholder: 'analitica' },
      {
        id: 'password',
        label: 'Contraseña',
        type: 'secret',
        value: '',
        required: true,
        help: 'Se guarda cifrada y no vuelve a mostrarse completa.',
      },
      { id: 'tls', label: 'Exigir TLS', type: 'switch', value: true },
    ],
    scopes: databaseScopes(),
  },
  storage: {
    name: 'Almacenamiento de archivos',
    provider: 'Proveedor de objetos',
    description: 'Indexa documentos de un espacio y los cita con su ruta original.',
    fields: [
      { id: 'space', label: 'Espacio', type: 'text', value: '', required: true },
      { id: 'accessKey', label: 'Clave de acceso', type: 'secret', value: '', required: true },
      { id: 'prefix', label: 'Carpeta raíz', type: 'text', value: '', help: 'Vacío para indexar el espacio entero.' },
    ],
    scopes: [
      { id: 'list', label: 'Listar archivos', description: 'Ve el catálogo completo del espacio.', granted: true },
      { id: 'read', label: 'Leer contenido', description: 'Extrae texto para responder con citas.', granted: true },
      { id: 'delete', label: 'Borrar archivos', description: 'Elimina objetos del espacio.', granted: false },
    ],
  },
  code: {
    name: 'Repositorio de código',
    provider: 'Proveedor de repositorios',
    description: 'Responde sobre el código, los cambios y las incidencias de una organización.',
    fields: [
      { id: 'organization', label: 'Organización', type: 'text', value: '', required: true },
      {
        id: 'token',
        label: 'Token de acceso',
        type: 'secret',
        value: '',
        required: true,
        help: 'Sin él, la instalación queda pendiente.',
      },
      { id: 'private', label: 'Incluir repositorios privados', type: 'switch', value: false },
    ],
    scopes: [
      { id: 'code', label: 'Leer código', description: 'Acceso de solo lectura a los repositorios.', granted: true },
      { id: 'issues', label: 'Leer incidencias', description: 'Consulta incidencias y comentarios.', granted: true },
      { id: 'pull', label: 'Proponer cambios', description: 'Abre ramas y propuestas de cambio.', granted: false },
    ],
  },
  messaging: {
    name: 'Mensajería de equipo',
    provider: 'Proveedor de mensajería',
    description: 'Busca decisiones y conversaciones recientes en los canales del equipo.',
    fields: [
      { id: 'workspace', label: 'Espacio de trabajo', type: 'text', value: '', required: true },
      { id: 'credential', label: 'Credencial del bot', type: 'secret', value: '', required: true },
      { id: 'channels', label: 'Canales', type: 'text', value: '', placeholder: '#general, #producto', help: 'Separados por comas.' },
    ],
    scopes: [
      { id: 'history', label: 'Leer historial', description: 'Consulta mensajes de los canales indicados.', granted: true },
      { id: 'files', label: 'Leer archivos adjuntos', description: 'Indexa lo que se comparte en los canales.', granted: false },
      { id: 'post', label: 'Publicar mensajes', description: 'Escribe en los canales como el bot.', granted: false },
    ],
  },
  docs: {
    name: 'Documentos en la nube',
    provider: 'Proveedor de documentos',
    description: 'Trabaja sobre las colecciones de documentos de una cuenta.',
    fields: [
      { id: 'collection', label: 'Colección', type: 'text', value: '', required: true },
      { id: 'rootPath', label: 'Ruta raíz', type: 'text', value: '/', placeholder: '/' },
      { id: 'account', label: 'Cuenta de servicio', type: 'secret', value: '', required: true },
    ],
    scopes: [
      { id: 'read', label: 'Leer documentos', description: 'Extrae el texto de la colección.', granted: true },
      { id: 'comments', label: 'Leer comentarios', description: 'Incluye los hilos de comentarios.', granted: false },
      { id: 'share', label: 'Compartir', description: 'Publica enlaces de los documentos.', granted: false },
    ],
  },
};

/** Conjuntos curados: agrupan fuentes ya conectadas para una consulta concreta. */
export const KNOWLEDGE_BASES: KnowledgeBase[] = [
  {
    id: 'kb-datos',
    name: 'Datos de explotación',
    description: 'Tablas de analítica con las métricas del día a día.',
    connectorIds: ['sql-analitica'],
    documents: 12_840,
    updatedAt: 'Actualizada hace 12 min',
  },
  {
    id: 'kb-decisiones',
    name: 'Decisiones del equipo',
    description: 'Conversaciones donde se cerraron temas, por si hay que recordarlas.',
    connectorIds: ['mensajeria-equipo'],
    documents: 860,
    updatedAt: 'Actualizada hace 6 días',
  },
];

/** Flujos guardados: lo que se lanza con un clic en vez de escribir un prompt. */
export const TEMPLATES: TemplateRow[] = [
  {
    id: 'tpl-consulta',
    name: 'Consulta de datos',
    description: 'Traduce una pregunta de negocio a una consulta sobre las tablas disponibles.',
    category: 'Datos',
    steps: 2,
    sources: ['Base de datos SQL'],
  },
  {
    id: 'tpl-resumen',
    name: 'Resumen ejecutivo',
    description: 'Resume los documentos de un conjunto en cinco puntos y una recomendación.',
    category: 'Análisis',
    steps: 3,
    sources: ['Documentos en la nube'],
  },
  {
    id: 'tpl-comparativa',
    name: 'Comparativa de fuentes',
    description: 'Contrasta la misma pregunta en dos fuentes y señala las diferencias.',
    category: 'Análisis',
    steps: 4,
    sources: ['Base de datos SQL', 'Mensajería de equipo'],
  },
  {
    id: 'tpl-informe',
    name: 'Borrador de informe',
    description: 'Monta un borrador con estructura, citas y una sección de dudas abiertas.',
    category: 'Redacción',
    steps: 5,
    sources: ['Documentos en la nube'],
  },
];

/** Textos del panel que no son datos de ninguna lista. */
export const CONNECTOR_COPY = {
  /** Nombre del espacio; es el `aria-label` del panel. */
  title: 'Conectores',
  close: 'Cerrar conectores',
  refresh: 'Actualizar',
  refreshBusy: 'Leyendo fuentes…',
  add: 'Añadir conector',
  search: 'Buscar por nombre o proveedor…',
  filterLabel: 'Filtrar por estado',
  clearFilters: 'Quitar filtros',
  emptyTitle: 'Ninguna fuente coincide',
  emptyBody: 'Prueba con otro estado o cambia la búsqueda: los filtros se suman.',
  errorTitle: 'Hay fuentes que necesitan atención',
  errorBody: 'Una credencial caducada deja la fuente fuera del chat hasta que se renueve.',
  backToList: 'Volver al listado',
  documents: 'documentos',
  lastSync: 'Última sincronización',
  status: 'Estado',
  detail: 'Ver detalle',
  configure: 'Configurar',
  sync: 'Sincronizar ahora',
  remove: 'Quitar conector',
  docs: 'Ver documentación',
  fieldSection: 'Conexión',
  scopeSection: 'Permisos',
  scopeHint: 'Lo que el agente puede hacer con esta fuente.',
  granted: 'Concedido',
  denied: 'Denegado',
  secretSet: 'Definido',
  secretUnset: 'Sin definir',
  switchOn: 'Activado',
  switchOff: 'Desactivado',
  open: 'Abrir conjunto',
  use: 'Usar plantilla',
  sources: 'Fuentes',
  steps: 'pasos',
  knowledgeHint: 'Conjuntos de fuentes ya conectadas, listos para preguntar sin elegir la fuente cada vez.',
  templatesHint: 'Flujos guardados que se lanzan sobre tus fuentes con un clic.',
  notYetBody: 'Todavía no está implementado en este esqueleto.',
  /** Asistentes por pasos. */
  cancel: 'Cancelar',
  saved: 'Configuración guardada',
  back: 'Atrás',
  next: 'Siguiente',
  finish: 'Guardar cambios',
  create: 'Crear conector',
  created: 'Conector añadido',
  addTitle: 'Añadir conector',
  configureTitle: 'Configurar',
  stepFamily: 'Familia',
  stepOf: 'Paso',
  of: 'de',
  nameLabel: 'Nombre',
  familyHint: 'Elige de qué tipo es la fuente que vas a conectar.',
  connectionHint: 'Los campos son de ejemplo: al guardar se actualiza el catálogo en memoria.',
  requiredHint: 'Completa los campos obligatorios para continuar.',
  summaryHint: 'Esto es lo que se va a guardar. Todavía no sale del navegador.',
  summaryFields: 'Campos definidos',
  summaryScopes: 'Permisos concedidos',
  none: 'Ninguno',
} as const;
