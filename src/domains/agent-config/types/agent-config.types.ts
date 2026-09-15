/**
 * @file src/domains/agent-config/types/agent-config.types.ts
 * @description Perillas de una ejecución. El DTO ya existe en el BFF
 * (`agentConfigSchema`); este tipo es su espejo en el cliente.
 */
export interface AgentRunSettings {
  model: string;
  temperature: number;
  memoryEnabled: boolean;
}

export const DEFAULT_AGENT_SETTINGS: AgentRunSettings = {
  model: '',
  temperature: 0.7,
  memoryEnabled: true,
};
