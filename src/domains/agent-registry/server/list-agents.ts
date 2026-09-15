import { z } from 'zod';

import { resultError, resultOk, type Result } from '@shared/result/result.pattern';
import { upstreamJson } from '@shared/server/fetch-json';
import type { AgentDetail, AgentSummary } from '../types/agent.types';

/**
 * @file src/domains/agent-registry/server/list-agents.ts
 * @description Lectura y normalización del catálogo de agentes en el BFF.
 *
 * Por qué se normaliza aquí y no en el cliente: la forma exacta del catálogo
 * cambia entre versiones del proveedor (array, mapa keyed por id, o `{ agents }`).
 * Si cada isla aprendiera a descifrarla, el acoplamiento al proveedor quedaría
 * distribuido por toda la UI. Un solo archivo lo absorbe.
 */

/** Claves que sí viajan al navegador. Todo lo demás se descarta. */
const rawAgentSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    instructions: z.unknown().optional(),
    tools: z.unknown().optional(),
  })
  .passthrough();

const rawAgentListSchema = z.union([
  z.array(rawAgentSchema),
  z.record(z.string(), rawAgentSchema),
  z.object({ agents: z.union([z.array(rawAgentSchema), z.record(z.string(), rawAgentSchema)]) }).passthrough(),
]);

export async function listAgents(): Promise<Result<AgentSummary[]>> {
  const upstream = await upstreamJson<unknown>('agents');
  if (!upstream.ok) return resultError<AgentSummary[]>(upstream.error);

  const parsed = rawAgentListSchema.safeParse(upstream.data);
  if (!parsed.success) {
    // Forma desconocida: se devuelve lista vacía en vez de reventar la vista.
    return resultOk([]);
  }

  return resultOk(toSummaries(parsed.data));
}

export async function getAgent(agentId: string): Promise<Result<AgentDetail | undefined>> {
  const upstream = await upstreamJson<unknown>(`agents/${encodeURIComponent(agentId)}`);
  if (!upstream.ok) return resultError<AgentDetail | undefined>(upstream.error);

  const parsed = rawAgentSchema.safeParse(upstream.data);
  if (!parsed.success) return resultOk(undefined);

  const [summary] = toSummaries([parsed.data]);
  return resultOk({
    ...(summary ?? { id: agentId, name: agentId, description: '' }),
    tools: toolNames(parsed.data['tools']),
  });
}

function toSummaries(source: z.infer<typeof rawAgentListSchema>): AgentSummary[] {
  const entries: Array<[string, z.infer<typeof rawAgentSchema>]> = Array.isArray(source)
    ? source.map((agent, index) => [agentIdOf(agent) ?? String(index), agent])
    : Object.entries('agents' in source ? (source.agents as Record<string, z.infer<typeof rawAgentSchema>>) : source);

  return entries
    .map(([key, agent]) => {
      const id = agentIdOf(agent) ?? key;
      return { id, name: agent['name'] ?? id, description: agent['description'] ?? '' };
    })
    .filter((agent) => agent.id !== '')
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

function agentIdOf(agent: z.infer<typeof rawAgentSchema>): string | undefined {
  return typeof agent['id'] === 'string' ? agent['id'] : typeof agent['name'] === 'string' ? agent['name'] : undefined;
}

/** Nombres de herramienta, sin sus schemas: la UI los enumera, no los invoca. */
function toolNames(tools: unknown): string[] {
  if (Array.isArray(tools)) {
    return tools
      .map((tool) => (typeof tool === 'string' ? tool : typeof tool === 'object' && tool !== null ? nameOf(tool) : undefined))
      .filter((name): name is string => name !== undefined && name !== '');
  }
  if (typeof tools === 'object' && tools !== null) return Object.keys(tools);
  return [];
}

function nameOf(tool: object): string | undefined {
  const record = tool as Record<string, unknown>;
  return typeof record['name'] === 'string' ? record['name'] : undefined;
}
