/**
 * @file src/domains/connectors/types/connector.types.ts
 * @description Vocabulario de la vista de conectores: la **forma** de los datos
 * que consume, sin decir de dónde salen.
 *
 * Es la frontera estable del slice. Mientras los componentes hablen de `Connector`
 * o `KnowledgeBase`, cambiar la semilla de `data/connectors.seed.ts` por lecturas
 * reales —o por `useQuery` de colada el día que exista servicio— no toca un solo
 * `.vue`.
 *
 * El **tono** de cada estado no vive aquí: el dato dice `status` y el mapa de
 * variantes está en el componente que lo pinta. Un color en el contrato habría que
 * duplicarlo para el modo oscuro.
 */
import type { Component } from 'vue';

/**
 * Pestañas del espacio. Los valores son el contrato del `?pestana=` de la URL, así
 * que renombrar uno es romper un enlace: se cambian a la vez el tipo, la semilla y
 * `routes.connectors`.
 */
export type ConnectorTab = 'fuentes' | 'conocimiento' | 'plantillas';

/** Familia del conector: decide el glifo y el tono del azulejo. */
export type ConnectorKind = 'database' | 'storage' | 'code' | 'messaging' | 'docs';

/** Estado de la conexión con la fuente externa. */
export type ConnectorStatus = 'connected' | 'pending' | 'error' | 'disconnected';

/** Filtro del catálogo: todos, o un estado concreto. */
export type ConnectorFilter = 'all' | ConnectorStatus;

/** Control que el modal de configuración pinta para un campo. */
export type ConnectorFieldType = 'text' | 'secret' | 'number' | 'select' | 'switch';

export interface ConnectorFieldOption {
  value: string;
  label: string;
}

/**
 * Un campo del formulario de configuración. El valor viaja en el mismo objeto
 * porque el modal edita un **borrador** clonado: nada se escribe en el catálogo
 * hasta que se guarda.
 */
export interface ConnectorField {
  id: string;
  label: string;
  type: ConnectorFieldType;
  value: string | boolean;
  placeholder?: string | undefined;
  help?: string | undefined;
  required?: boolean | undefined;
  /** Solo para `type: 'select'`. */
  options?: ConnectorFieldOption[] | undefined;
}

/** Un permiso que la fuente externa concede al agente. */
export interface ConnectorScope {
  id: string;
  label: string;
  description: string;
  granted: boolean;
}

export interface Connector {
  id: string;
  name: string;
  provider: string;
  description: string;
  kind: ConnectorKind;
  status: ConnectorStatus;
  /** Explicación de una línea del estado, para que no haya un color sin motivo. */
  statusNote: string;
  /** Documentos indexados de esta fuente. */
  documents: number;
  lastSync: string;
  fields: ConnectorField[];
  scopes: ConnectorScope[];
}

/** Un conjunto curado de fuentes, listo para consultar desde el chat. */
export interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  /** Fuentes que la componen, por `Connector.id`. */
  connectorIds: string[];
  documents: number;
  updatedAt: string;
}

/** Un flujo guardado que se puede lanzar sobre una o varias fuentes. */
export interface TemplateRow {
  id: string;
  name: string;
  description: string;
  category: string;
  /** Pasos del flujo, para dar una idea del tamaño sin abrirlo. */
  steps: number;
  sources: string[];
}

/** Una entrada de la barra de pestañas, con su glifo. */
export interface ConnectorTabItem {
  id: ConnectorTab;
  label: string;
  icon: Component;
}

/**
 * Guarda del `?pestana=` de la URL. Una query es entrada de usuario: sin esto, un
 * enlace manipulado deja la vista con una pestaña que no existe y el panel en
 * blanco, sin un error que lo explique.
 */
export function isConnectorTab(value: string | undefined): value is ConnectorTab {
  return value === 'fuentes' || value === 'conocimiento' || value === 'plantillas';
}
