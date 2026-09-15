import { normalizeServiceError, type ServiceError } from '@shared/result/result.pattern';

/**
 * @file src/shared/observability/report-error.ts
 * @description Costura única para todo error que merezca ser reportado.
 *
 * Hoy es un `console.error` con forma estable. Existe para que no aparezcan
 * `try/catch` con logs sueltos esparcidos por los slices: cuando se conecte un
 * Sentry/OpenTelemetry, el cambio es de 5 líneas en este archivo y cero en el
 * resto del repo.
 *
 * No llama a `console` en los tests por defecto: se puede sustituir el
 * `sink` desde `tests/` sin mocks de módulo.
 */
export interface ReportContext {
  /** Desde dónde se reporta: `agent-chat/stream`, `bff/relay`, etc. */
  scope: string;
  /** Identificadores seguros para correlacionar. Nunca secretos ni prompts. */
  tags?: Record<string, string | number | boolean> | undefined;
}

type Sink = (error: ServiceError, context: ReportContext) => void;

const sink: Sink = (error, context) => {
  if (import.meta.env.DEV) {
    console.error(`[${context.scope}] ${error.statusCode} ${error.code ?? ''}`, error.message, context.tags);
  }
};

/**
 * Normaliza lo que sea y lo reporta. Devuelve el `ServiceError` ya normalizado
 * para que el llamador pueda devolverlo sin volver a procesarlo.
 */
export function reportError(input: unknown, context: ReportContext): ServiceError {
  const error = normalizeServiceError(input);
  sink(error, context);
  return error;
}
