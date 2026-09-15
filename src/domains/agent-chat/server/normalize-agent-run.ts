import { z } from 'zod';

import { resultError, resultOk, type Result } from '@shared/result/result.pattern';
import type { RunConfig } from '../types/chat.types';

/**
 * @file src/domains/agent-chat/server/normalize-agent-run.ts
 * @description Validación de entrada y recorte de salida del BFF.
 *
 * Dos responsabilidades que van juntas y no deben repartirse por el repo:
 *  1. **Entrada**: nada que no pase este schema llega al upstream. El límite de
 *     `prompt` existe porque el relay reenvía verbatim: sin él, el bodySizeLimit
 *     del adapter sería la única red.
 *  2. **Salida**: `z.object` de zod descarta las claves no declaradas, así que
 *     validar contra estos schemas **es** el recorte. Instrucciones de sistema
 *     completas, costos e ids internos del proveedor no llegan al navegador por
 *     accidente: solo llegan si se declaran aquí.
 */

const runConfigSchema = z.object({
  model: z.string().max(120).optional(),
  temperature: z.number().min(0).max(2).optional(),
  memoryEnabled: z.boolean().optional(),
});

export const runRequestSchema = z.object({
  prompt: z.string().min(1, 'El mensaje no puede estar vacío.').max(32_000),
  thread: z.string().max(96).optional(),
  config: runConfigSchema.optional(),
});

export interface ParsedRunRequest {
  prompt: string;
  thread: string | undefined;
  config: RunConfig | undefined;
}

/** Valida el body del relay. Devuelve el primer problema con su campo. */
export function parseRunRequest(input: unknown): Result<ParsedRunRequest> {
  const parsed = runRequestSchema.safeParse(input);
  if (parsed.success) {
    return resultOk({
      prompt: parsed.data.prompt,
      thread: parsed.data.thread,
      config: parsed.data.config as RunConfig | undefined,
    });
  }

  const issue = parsed.error.issues[0];
  return resultError<ParsedRunRequest>({
    statusCode: 400,
    code: 'invalid_request',
    message: issue?.message ?? 'La petición no es válida.',
    field: issue ? issue.path.join('.') : undefined,
    details: parsed.error.issues,
  });
}

/** Forma recortada de un agente para el navegador. */
export const agentSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().default(''),
});

export const agentListSchema = z.object({
  agents: z.record(z.string(), agentSummarySchema).optional(),
});

/** Upstream responde `{ agents: { id: {...} } }` o un array: se aceptan las dos. */
export const agentListFlexibleSchema = z.union([
  z.array(z.unknown()),
  z.record(z.string(), z.unknown()),
  agentListSchema,
]);

/** Forma recortada de un hilo de memoria. */
export const threadSummarySchema = z.object({
  id: z.string(),
  title: z.string().default('Conversación'),
  updatedAt: z.string().default(''),
});

export const agentConfigSchema = z.object({
  model: z.string().default(''),
  temperature: z.number().min(0).max(2).default(0.7),
  memoryEnabled: z.boolean().default(true),
});
