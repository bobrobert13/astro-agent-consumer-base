/**
 * @file src/shared/upstream/fetch-json.ts
 * @description GET tipado al upstream con timeout, y su fallo como `Result`.
 *
 * Lo usan los handlers del BFF para las lecturas JSON (catálogo de agentes,
 * hilos). Para el streaming está `agent-chat/server/stream-relay.ts`, que es
 * verbatim y no pasa por aquí.
 */
import { resultError, resultOk, normalizeServiceError, type Result } from '@shared/result/result.pattern';
import { reportError } from '@shared/observability/report-error';
import { AGENT_CONNECT_TIMEOUT } from '@shared/env/server';
import { upstreamHeaders, upstreamUrl } from './upstream';

/**
 * @param relativePath Ruta bajo el `/api` del upstream, p. ej. `agents`.
 */
export async function upstreamJson<T>(relativePath: string, init: RequestInit = {}): Promise<Result<T>> {
  const url = upstreamUrl(relativePath);
  const neverAborts = new AbortController().signal;

  try {
    const response = await fetch(url, {
      ...init,
      headers: upstreamHeaders(init.headers),
      signal: AbortSignal.any([init.signal ?? neverAborts, AbortSignal.timeout(AGENT_CONNECT_TIMEOUT)]),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      const parsed: unknown = text === '' ? {} : safeJson(text);
      return resultError<T>(normalizeServiceError(parsed, response.status));
    }

    return resultOk((await response.json()) as T);
  } catch (error) {
    reportError(error, { scope: 'upstream/json', tags: { path: relativePath } });
    return resultError<T>(normalizeServiceError(error, 502));
  }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { message: text.slice(0, 200) };
  }
}
