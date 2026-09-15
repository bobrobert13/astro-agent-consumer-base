/**
 * @file src/domains/agent-registry/types/agent.types.ts
 * @description DTO del catálogo de agentes. Lo que ve el navegador, no lo que
 * devuelve el proveedor: el recorte ocurre en `server/`.
 */
export interface AgentSummary {
  id: string;
  name: string;
  description: string;
}

export interface AgentDetail extends AgentSummary {
  /** Herramientas declaradas. Se muestran por nombre, sin sus schemas. */
  tools: string[];
}
