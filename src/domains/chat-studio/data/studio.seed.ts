/**
 * @file src/domains/chat-studio/data/studio.seed.ts
 * @description Datos semilla del estudio: el esqueleto visual con contenido de
 * relleno, aislado en un solo módulo para que sustituirlo por lecturas reales no
 * obligue a tocar ningún componente.
 *
 * Vive en `data/` y no en `composables/` porque no compone nada: son constantes.
 *
 * Dos reglas del encargo que se ven aquí:
 *  - **Copy genérico**: nada del vertical de negocio ni de la marca de la
 *    plantilla original. Lo que hay son ejemplos neutros de un boilerplate.
 *  - **Sin colores**: el tono de cada tipo de recurso es una utilidad de token y
 *    vive en el componente que lo pinta (`StudioResourceRow`), no en el dato.
 */
import {
  AudioLines,
  BookOpen,
  Boxes,
  Compass,
  Database,
  FileImage,
  FileSpreadsheet,
  FileText,
  Globe,
  Image,
  LayoutGrid,
  Lightbulb,
  Link2,
  Music,
  Paperclip,
} from '@lucide/vue';

import type {
  ComposerTool,
  HistoryGroup,
  NavItem,
  ResourceKind,
  ResourceRow,
  SourceRow,
  SuggestionCard,
  StudioModel,
} from '../types/studio.types';

const BASE_MODEL: StudioModel = { id: 'base', label: 'Modelo base' };

/** Modelos del selector de la cabecera. El tercero enseña la etiqueta de la plantilla. */
export const STUDIO_MODELS: StudioModel[] = [
  BASE_MODEL,
  { id: 'lite', label: 'Modelo ligero' },
  { id: 'pro', label: 'Modelo avanzado', tag: 'Mejorar' },
];

export const DEFAULT_STUDIO_MODEL: StudioModel = BASE_MODEL;

export const STUDIO_NAV: NavItem[] = [
  { id: 'explore', label: 'Explorar', icon: Compass },
  { id: 'knowledge', label: 'Base de conocimiento', icon: BookOpen },
  { id: 'templates', label: 'Plantillas', icon: LayoutGrid },
];

/**
 * Historial de ejemplo. Los `threadId` son reales a propósito: cada entrada es un
 * enlace a `/chat/<hilo>`, así que la lista no es decorativa — ejercita el
 * contrato de URL y la persistencia de la isla al navegar.
 */
export const STUDIO_HISTORY: HistoryGroup[] = [
  {
    label: 'Hoy',
    entries: [
      { id: 'hoy-1', label: 'Conversación de ejemplo de hoy', threadId: 'ejemplo-hoy-1' },
      { id: 'hoy-2', label: 'Segunda consulta del día, sin resolver', threadId: 'ejemplo-hoy-2' },
    ],
  },
  {
    label: 'Ayer',
    entries: [
      { id: 'ayer-1', label: 'Resumen de un documento largo', threadId: 'ejemplo-ayer-1' },
      { id: 'ayer-2', label: 'Comparativa entre dos fuentes', threadId: 'ejemplo-ayer-2' },
      { id: 'ayer-3', label: 'Consulta de datos externos', threadId: 'ejemplo-ayer-3' },
    ],
  },
  {
    label: 'Semana pasada',
    faded: true,
    entries: [
      { id: 'sem-1', label: 'Borrador de un informe', threadId: 'ejemplo-semana-1' },
      {
        id: 'sem-2',
        label: 'Pregunta rápida sobre una política interna',
        threadId: 'ejemplo-semana-2',
        faded: true,
      },
    ],
  },
];

/** Tarjetas del estado vacío: cada una rellena el composer con su `prompt`. */
export const STUDIO_SUGGESTIONS: SuggestionCard[] = [
  {
    id: 'documents',
    title: 'Analizar documentos',
    description: 'Resume, compara y extrae conclusiones de tus archivos.',
    prompt: 'Resume este documento: ',
    icon: FileText,
  },
  {
    id: 'sources',
    title: 'Buscar en fuentes',
    description: 'Consulta referencias externas con citas verificables.',
    prompt: 'Busca información sobre ',
    icon: Globe,
  },
  {
    id: 'data',
    title: 'Consultar datos',
    description: 'Pregunta por datos de sistemas conectados.',
    prompt: 'Consulta los datos de ',
    icon: Database,
  },
];

/**
 * Herramientas del composer, en los dos grupos de la plantilla: las dos primeras
 * van dentro de la caja que agrupa los atajos de análisis y el resto a la
 * derecha, junto al botón de enviar.
 */
export const COMPOSER_TOOLS_LEADING: ComposerTool[] = [
  { id: 'image', label: 'Adjuntar imagen', icon: Image },
  { id: 'ideas', label: 'Sugerencias de análisis', icon: Lightbulb },
];

export const COMPOSER_TOOLS_TRAILING: ComposerTool[] = [
  { id: 'connectors', label: 'Conectores externos', icon: Boxes },
  { id: 'web', label: 'Buscar en la web', icon: Globe },
  { id: 'attach', label: 'Adjuntar archivo', icon: Paperclip },
  { id: 'voice', label: 'Modo de voz', icon: AudioLines },
];

export const STUDIO_RESOURCES: ResourceRow[] = [
  { id: 'r1', kind: 'pdf', name: 'informe-de-ejemplo.pdf', meta: 'PDF · 2,4 MB · 12 páginas' },
  { id: 'r2', kind: 'sheet', name: 'presupuesto-de-ejemplo.xlsx', meta: 'Hoja de cálculo · 3 hojas' },
  { id: 'r3', kind: 'image', name: 'captura-de-ejemplo.png', meta: 'Imagen · 1,1 MB · 1.920 × 1.080' },
  { id: 'r4', kind: 'doc', name: 'notas-de-ejemplo.docx', meta: 'Documento · 5 páginas' },
  { id: 'r5', kind: 'link', name: 'example.com/referencia', meta: 'Enlace · example.com' },
  { id: 'r6', kind: 'audio', name: 'reunion-de-ejemplo.mp3', meta: 'Audio · 14:32' },
];

export const STUDIO_SOURCES: SourceRow[] = [
  {
    id: 's1',
    title: 'Documentación de referencia',
    domain: 'example.com',
    url: 'https://example.com/docs',
    snippet: 'Referencia consultada para responder al último mensaje de la conversación.',
    scope: 'interaction',
    usedAt: 'Mensaje 2 · hace 5 min',
  },
  {
    id: 's2',
    title: 'Guía interna de ejemplo',
    domain: 'docs.example.org',
    url: 'https://docs.example.org/guia',
    snippet: 'Se usó al principio de la sesión y sigue disponible para el resto del hilo.',
    scope: 'session',
    usedAt: 'Mensaje 1 · hace 12 min',
  },
  {
    id: 's3',
    title: 'Artículo externo de ejemplo',
    domain: 'ejemplo.net',
    url: 'https://ejemplo.net/articulo',
    snippet: 'Fuente externa citada en la comparativa entre documentos.',
    scope: 'session',
    usedAt: 'Mensaje 4 · hace 2 min',
  },
];

/** Glifo de cada tipo de recurso, para no repetir el mapa en dos vistas. */
export const RESOURCE_ICONS: Record<ResourceKind, typeof FileText> = {
  image: FileImage,
  pdf: FileText,
  doc: FileText,
  sheet: FileSpreadsheet,
  link: Link2,
  audio: Music,
};

/** Cuerpo del modal de vista previa: texto de relleno por tipo de recurso. */
export const PREVIEW_BODY: Record<ResourceKind, string[]> = {
  image: [],
  pdf: [
    'Extracto de ejemplo de la primera página del documento. El contenido real llegará cuando el panel lea la conversación.',
    'Segunda línea citable, con el mismo tono neutro que el resto de la semilla.',
  ],
  doc: ['Primer párrafo de ejemplo del documento.', 'Segundo párrafo de ejemplo.'],
  sheet: [],
  link: ['Descripción de ejemplo del enlace, de dónde lo tomó el agente y por qué lo citó.'],
  audio: [],
};

/** Filas de ejemplo de una hoja de cálculo, para el cuerpo del modal. */
export const PREVIEW_SHEET_ROWS: string[][] = [
  ['Concepto', 'Importe', 'Periodo'],
  ['Fila de ejemplo', '1.000,00', 'Ene'],
  ['Segunda fila', '750,00', 'Feb'],
];

/**
 * Huecos de imagen del estudio. Aquí es donde se sustituye cada `StudioImageSlot`
 * por la imagen definitiva: basta con pasarle `src`.
 */
export const STUDIO_IMAGE_SLOTS = {
  brand: 'Marca del rail',
  hero: 'Marca del estado vacío',
  assistant: 'Avatar del asistente',
} as const;

/** La tarjeta de usuario: iniciales, nombre y plan, sin marca. */
export const STUDIO_USER = {
  initials: 'UE',
  name: 'Usuario de ejemplo',
  plan: 'Plan base',
} as const;

/** Textos del estudio que no son datos de ninguna lista. */
export const STUDIO_COPY = {
  newChat: 'Nuevo chat',
  heroTitle: '¿Con qué quieres empezar?',
  heroPillStrong: 'Amplía',
  heroPill: 'tu plan para conectar más fuentes',
  composerPlaceholder: 'Escribe tu consulta…',
  composerLabel: 'Mensaje para el asistente',
  /** Solo en el primer envío del hilo: después la conexión ya está hecha. */
  connecting: 'Conectando con el agente…',
  /** Texto para lectores de pantalla mientras el turno está en curso. */
  generating: 'Generando respuesta…',
  stalled: 'Sin respuesta del agente.',
  retry: 'Reintentar',
  connectBar: 'Conecta tus fuentes externas para consultarlas desde el chat',
  disclaimer: 'El asistente puede cometer errores. Verifica la información antes de usarla.',
  disclaimerLink: 'Preferencias de cookies',
  contextHint: 'Archivos y enlaces disponibles en esta conversación. Pulsa cualquiera para verlo.',
  notImplemented: 'Todavía no está implementado en este esqueleto.',
} as const;
