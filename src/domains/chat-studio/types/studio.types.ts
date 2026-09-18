/**
 * @file src/domains/chat-studio/types/studio.types.ts
 * @description Vocabulario del estudio de chat: la **forma** de los datos que
 * consume la vista, sin decir de dónde salen.
 *
 * El estudio arranca con datos semilla estáticos (`data/studio.seed.ts`), así que estos
 * contratos son la frontera estable del slice: mientras los componentes solo
 * hablen de `ResourceRow` o `HistoryGroup`, sustituir la semilla por una lectura
 * real no toca un solo `.vue`.
 */
import type { Component } from 'vue';

/** Pestañas del panel de contexto. */
export type PanelTab = 'recursos' | 'fuentes';

/** Ámbito de las fuentes: la ejecución en curso o la sesión entera. */
export type SourceScope = 'interaction' | 'session';

/** Tipos de recurso que el panel sabe pintar. */
export type ResourceKind = 'image' | 'pdf' | 'doc' | 'sheet' | 'link' | 'audio';

/** Una entrada del selector de modelo de la cabecera. */
export interface StudioModel {
  id: string;
  label: string;
  /** Etiqueta a la derecha de la opción ("Mejorar"), si la tiene. */
  tag?: string | undefined;
}

/**
 * Secciones del rail. El id es una unión **cerrada** a propósito: el estudio mapea
 * cada una a su destino en el panel lateral, y un `string` abierto dejaría ese mapa
 * incompleto sin que nada avisara —habría una sección que no abre nada, o una que
 * abre lo de otra.
 */
export type NavId = 'knowledge' | 'templates';

/** Un destino de la navegación lateral con su glifo. */
export interface NavItem {
  id: NavId;
  label: string;
  icon: Component;
}

/** Un hilo del historial. `faded` reproduce el desvanecido por antigüedad. */
export interface HistoryEntry {
  id: string;
  label: string;
  /** Hilo al que apunta el enlace: la URL es el contrato entre vistas. */
  threadId: string;
  faded?: boolean | undefined;
}

/** El historial se agrupa por fecha, como en la plantilla. */
export interface HistoryGroup {
  label: string;
  faded?: boolean | undefined;
  entries: HistoryEntry[];
}

/** Una tarjeta del estado vacío: al pulsarla rellena el composer con `prompt`. */
export interface SuggestionCard {
  id: string;
  title: string;
  description: string;
  prompt: string;
  icon: Component;
}

/** Una herramienta del composer (adjuntar, buscar, voz…). */
export interface ComposerTool {
  id: string;
  label: string;
  icon: Component;
}

/** Una fila del panel de contexto: un archivo o un enlace de la conversación. */
export interface ResourceRow {
  id: string;
  kind: ResourceKind;
  name: string;
  meta: string;
}

/** Una referencia usada por el agente, con su ámbito. */
export interface SourceRow {
  id: string;
  title: string;
  domain: string;
  url: string;
  snippet: string;
  scope: SourceScope;
  usedAt: string;
}
