/**
 * @file src/domains/agent-config/server/config.schema.ts
 * @description El DTO de las perillas de ejecución, y sus valores por defecto.
 *
 * Vive aquí, y no en `agent-chat/server`, porque el dueño del dato es este slice:
 * el formulario que lo edita, la ruta que lo sirve y el espejo de cliente
 * (`DEFAULT_AGENT_SETTINGS`) están todos aquí. Estaba en `agent-chat` por el
 * camino que abrió la primera ruta que lo necesitó, y eso obligaba a
 * `agent-config` a mirar hacia otra slice para validar lo suyo.
 *
 * Regla que sostiene el test de contratos: si este schema cambia y el espejo de
 * cliente no, la UI enseña un valor que el servidor no usó.
 */
import { z } from 'zod';

export const agentConfigSchema = z.object({
  model: z.string().default(''),
  temperature: z.number().min(0).max(2).default(0.7),
  memoryEnabled: z.boolean().default(true),
});
