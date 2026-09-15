import { z } from 'zod';

import { resultError, resultOk, type Result } from '@shared/result/result.pattern';
import { upstreamJson } from '@shared/server/fetch-json';
import type { Page, ThreadSummary } from '../types/session.types';

/**
 * @file src/domains/agent-sessions/server/list-threads.ts
 * @description Hilos del `resource` resuelto en el servidor.
 *
 * El `resource` **nunca** llega como parámetro de la ruta: viene de
 * `agent-chat/server/session-scope.ts`. Así nadie lista los hilos de otra
 * identidad cambiando un id en la URL.
 */
const rawThreadSchema = z
  .object({
    id: z.string().optional(),
    thread_id: z.string().optional(),
    title: z.string().optional(),
    name: z.string().optional(),
    updatedAt: z.string().optional(),
    createdAt: z.string().optional(),
  })
  .passthrough();

const rawThreadListSchema = z.union([
  z.array(rawThreadSchema),
  z.record(z.string(), rawThreadSchema),
  z.object({ threads: z.union([z.array(rawThreadSchema), z.record(z.string(), rawThreadSchema)]) }).passthrough(),
]);

export async function listThreads(resource: string): Promise<Result<Page<ThreadSummary>>> {
  const upstream = await upstreamJson<unknown>(
    `memory/threads?resourceid=${encodeURIComponent(resource)}`
  );
  if (!upstream.ok) return resultError<Page<ThreadSummary>>(upstream.error);

  const parsed = rawThreadListSchema.safeParse(upstream.data);
  if (!parsed.success) return resultOk({ items: [], total: 0 });

  const items = toSummaries(parsed.data).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return resultOk({ items, total: items.length });
}

function toSummaries(source: z.infer<typeof rawThreadListSchema>): ThreadSummary[] {
  const entries: Array<[string, z.infer<typeof rawThreadSchema>]> = Array.isArray(source)
    ? source.map((thread, index) => [thread['id'] ?? thread['thread_id'] ?? String(index), thread])
    : Object.entries('threads' in source ? (source.threads as Record<string, z.infer<typeof rawThreadSchema>>) : source);

  return entries
    .map(([key, thread]) => ({
      id: thread['id'] ?? thread['thread_id'] ?? key,
      title: thread['title'] ?? thread['name'] ?? 'Conversación',
      updatedAt: thread['updatedAt'] ?? thread['createdAt'] ?? '',
    }))
    .filter((thread) => thread.id !== '');
}
