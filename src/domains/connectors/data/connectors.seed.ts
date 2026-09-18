/**
 * @file src/domains/connectors/data/connectors.seed.ts
 * @description Datos semilla de la vista de conectores y todo su copy, en un solo
 * módulo para que sustituirlos por lecturas reales no obligue a tocar un `.vue`.
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
  ConnectorStatus,
  ConnectorTabItem,
  KnowledgeBase,
  TemplateRow,
} from '../types/connector.types';

/** Pestañas del espacio, en el orden en que se pintan. */
export const CONNECTOR_TABS: ConnectorTabItem[] = [
  { id: 'fuentes', label: 'Conectores', icon: Boxes },
  { id: 'conocimiento', label: 'Base de conocimiento', icon: BookOpen },
  { id: 'plantillas', label: 'Plantillas', icon: LayoutGrid },
];

/** Glifo de cada familia, para no repetir el mapa en dos vistas. */
export const CONNECTOR_ICONS: Record<ConnectorKind, typeof Database> = {
  database: Database,
  storage: HardDrive,
  code: GitBranch,
  messaging: MessagesSquare,
  docs: NotebookText,
};

export const CONNECTOR_STATUS_LABELS: Record<ConnectorStatus, string> = {
  connected: 'Conectado',
  pending: 'Pendiente',
  error: 'Con error',
  disconnected: 'Sin conectar',
};

export const CONNECTOR_FILTERS: { id: ConnectorFilter; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'connected', label: 'Conectados' },
  { id: 'pending', label: 'Pendientes' },
  { id: 'error', label: 'Con error' },
  { id: 'disconnected', label: 'Sin conectar' },
];

/**
 * El catálogo. Los cuatro estados están representados a propósito: sin un
 * `pending`, un `error` y un `disconnected` en la semilla, los filtros y la fila
 * de estados no se pueden evaluar —serían un adorno que siempre sale en verde—.
 */
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
    docsUrl: 'https://example.com/docs/base-de-datos',
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
    scopes: [
      { id: 'schema', label: 'Leer el esquema', description: 'Lista tablas, columnas y tipos.', granted: true },
      { id: 'rows', label: 'Leer registros', description: 'Consulta filas de las tablas del esquema.', granted: true },
      {
        id: 'write',
        label: 'Escribir registros',
        description: 'Permite insertar o modificar filas. No recomendado.',
        granted: false,
      },
    ],
  },
  {
    id: 'archivos-cloud',
    name: 'Almacenamiento de archivos',
    provider: 'Proveedor de objetos',
    description: 'Indexa documentos de un espacio de almacenamiento y los cita con su ruta original.',
    kind: 'storage',
    status: 'connected',
    statusNote: 'Sincronizado esta mañana',
    documents: 3_420,
    lastSync: 'hace 3 h',
    docsUrl: 'https://example.com/docs/almacenamiento',
    fields: [
      { id: 'space', label: 'Espacio', type: 'text', value: 'documentos-internos', required: true },
      {
        id: 'region',
        label: 'Región',
        type: 'select',
        value: 'eu-west',
        options: [
          { value: 'eu-west', label: 'Europa occidental' },
          { value: 'us-east', label: 'Estados Unidos' },
          { value: 'sa-east', label: 'Sudamérica' },
        ],
      },
      { id: 'prefix', label: 'Carpeta raíz', type: 'text', value: 'publico/', help: 'Vacío para indexar el espacio entero.' },
      {
        id: 'accessKey',
        label: 'Clave de acceso',
        type: 'secret',
        value: 'clave-de-ejemplo',
        required: true,
      },
      { id: 'versions', label: 'Indexar versiones antiguas', type: 'switch', value: false },
    ],
    scopes: [
      { id: 'list', label: 'Listar archivos', description: 'Ve el catálogo completo del espacio.', granted: true },
      { id: 'read', label: 'Leer contenido', description: 'Extrae texto para responder con citas.', granted: true },
      { id: 'delete', label: 'Borrar archivos', description: 'Elimina objetos del espacio.', granted: false },
    ],
  },
  {
    id: 'repositorio-codigo',
    name: 'Repositorio de código',
    provider: 'Proveedor de repositorios',
    description: 'Responde sobre el código, los cambios y los issues de una organización.',
    kind: 'code',
    status: 'pending',
    statusNote: 'Falta autorizar la instalación',
    documents: 0,
    lastSync: 'Nunca',
    docsUrl: 'https://example.com/docs/repositorios',
    fields: [
      {
        id: 'host',
        label: 'Servidor',
        type: 'select',
        value: 'example.com',
        options: [
          { value: 'example.com', label: 'Servidor público' },
          { value: 'git.example.org', label: 'Servidor privado' },
        ],
      },
      { id: 'organization', label: 'Organización', type: 'text', value: 'equipo-producto', required: true },
      { id: 'token', label: 'Token de acceso', type: 'secret', value: '', required: true, help: 'Sin él, la instalación queda pendiente.' },
      { id: 'private', label: 'Incluir repositorios privados', type: 'switch', value: true },
    ],
    scopes: [
      { id: 'code', label: 'Leer código', description: 'Acceso de solo lectura a los repositorios.', granted: false },
      { id: 'issues', label: 'Leer issues', description: 'Consulta incidencias y comentarios.', granted: false },
      { id: 'pull', label: 'Proponer cambios', description: 'Abre ramas y propuestas de cambio.', granted: false },
    ],
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
    docsUrl: 'https://example.com/docs/mensajeria',
    fields: [
      { id: 'workspace', label: 'Espacio de trabajo', type: 'text', value: 'equipo-producto', required: true },
      {
        id: 'credential',
        label: 'Credencial del bot',
        type: 'secret',
        value: 'credencial-caducada',
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
    docsUrl: 'https://example.com/docs/documentos',
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

/** Conjuntos curados: agrupan fuentes ya conectadas para una consulta concreta. */
export const KNOWLEDGE_BASES: KnowledgeBase[] = [
  {
    id: 'kb-manual',
    name: 'Manual interno',
    description: 'Procesos, políticas y acuerdos del equipo, listos para preguntar.',
    connectorIds: ['documentos-cloud', 'archivos-cloud'],
    documents: 640,
    updatedAt: 'Actualizada hace 2 días',
  },
  {
    id: 'kb-producto',
    name: 'Documentación de producto',
    description: 'Especificaciones y notas de versión de lo que se construye.',
    connectorIds: ['documentos-cloud'],
    documents: 215,
    updatedAt: 'Actualizada hace 5 h',
  },
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
    documents: 310,
    updatedAt: 'Actualizada hace 6 días',
  },
];

/** Flujos guardados: lo que se lanza con un clic en vez de escribir un prompt. */
export const TEMPLATES: TemplateRow[] = [
  {
    id: 'tpl-resumen',
    name: 'Resumen ejecutivo',
    description: 'Resume un conjunto de documentos en cinco puntos y una recomendación.',
    category: 'Análisis',
    steps: 3,
    sources: ['Manual interno', 'Documentación de producto'],
  },
  {
    id: 'tpl-comparativa',
    name: 'Comparativa de fuentes',
    description: 'Contrasta la misma pregunta en varias fuentes y señala las diferencias.',
    category: 'Análisis',
    steps: 4,
    sources: ['Manual interno', 'Decisiones del equipo'],
  },
  {
    id: 'tpl-informe',
    name: 'Borrador de informe',
    description: 'Monta un borrador con estructura, citas y una sección de dudas abiertas.',
    category: 'Redacción',
    steps: 5,
    sources: ['Documentación de producto'],
  },
  {
    id: 'tpl-consulta',
    name: 'Consulta de datos',
    description: 'Traduce una pregunta de negocio a una consulta sobre las tablas disponibles.',
    category: 'Datos',
    steps: 2,
    sources: ['Datos de explotación'],
  },
  {
    id: 'tpl-revision',
    name: 'Revisión de cambios',
    description: 'Revisa una propuesta de cambio contra la documentación vigente.',
    category: 'Desarrollo',
    steps: 4,
    sources: ['Repositorio de código', 'Documentación de producto'],
  },
  {
    id: 'tpl-onboarding',
    name: 'Guía de incorporación',
    description: 'Arma el recorrido de una persona nueva a partir del manual y las decisiones.',
    category: 'Equipo',
    steps: 6,
    sources: ['Manual interno', 'Decisiones del equipo'],
  },
];

/** Textos de la vista que no son datos de ninguna lista. */
export const CONNECTOR_COPY = {
  title: 'Conectores',
  subtitle: 'Fuentes externas, conocimiento y plantillas del chat',
  back: 'Volver al chat',
  refresh: 'Actualizar',
  refreshBusy: 'Leyendo fuentes…',
  add: 'Añadir conector',
  search: 'Buscar por nombre o proveedor…',
  filterLabel: 'Filtrar por estado',
  clearFilters: 'Quitar filtros',
  emptyTitle: 'Ningún conector coincide',
  emptyBody: 'Prueba con otro estado o cambia la búsqueda: los filtros de arriba se suman.',
  errorTitle: 'Hay conectores que necesitan atención',
  errorBody: 'Una credencial caducada deja la fuente fuera del chat hasta que se renueve.',
  documents: 'documentos',
  lastSync: 'Última sincronización',
  configure: 'Configurar',
  detail: 'Ver detalle',
  saved: 'Configuración guardada',
  save: 'Guardar cambios',
  cancel: 'Cancelar',
  pendingSection: 'Sección en construcción',
  pendingBody: 'El esqueleto deja el sitio y su forma, pero el contenido llega en la siguiente fase.',
} as const;
