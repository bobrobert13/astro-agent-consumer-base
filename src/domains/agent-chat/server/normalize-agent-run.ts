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

/**
 * Identificador de agente. Estrecho a propósito: el valor se interpola en la
 * ruta del upstream (`/chat/<id>`), así que el traversal se cierra en el origen
 * —`sanitizePath` del relay queda como segunda red— y de paso se rechaza lo que
 * nunca es un id real.
 */
export const agentIdSchema = z
  .string()
  .min(1)
  .max(96)
  .regex(/^[A-Za-z0-9_-]+$/, 'El identificador del agente no es válido.');

/**
 * Cuerpo de una ejecución de chat. A diferencia de `runRequestSchema`, este **sí**
 * describe lo que llega: lo construye el cliente (su `prepareSendMessagesRequest`),
 * no el wire format de un SDK ajeno.
 *
 * Las piezas de cada mensaje se dejan opacas a propósito: son `UIMessage` del AI
 * SDK y su forma evoluciona con la versión; validarlas aquí ataría el BFF a ella.
 * El cuerpo que viaja al upstream es el original, no el recortado por zod.
 */
export const chatRequestSchema = z.object({
  agentId: agentIdSchema,
  messages: z.array(z.unknown()).min(1, 'No hay nada que enviar.'),
});

/**
 * Destino del stream de chat en el upstream, derivado del cuerpo.
 *
 * Vive aquí y no en el endpoint por una razón dura: el cuerpo de una petición
 * **solo se puede leer una vez**. El relay ya lo abre para inyectar la identidad
 * de memoria (`relay-body.ts`), y aprovecha esa misma lectura para resolver el
 * destino; un handler que validara por su cuenta consumiría el `Request` y el
 * relay ya no tendría nada que reenviar.
 *
 * `undefined` ⇒ el relay responde 400 y no se abre conexión con el upstream.
 */
export function chatUpstreamPath(payload: unknown): string | undefined {
  const parsed = chatRequestSchema.safeParse(payload);
  return parsed.success ? `chat/${parsed.data.agentId}` : undefined;
}
