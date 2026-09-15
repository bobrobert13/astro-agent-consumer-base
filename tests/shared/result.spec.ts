/**
 * @file tests/shared/result.spec.ts
 * @description El contrato `Result<T>` es lo único que une servicios, BFF e islas.
 * Se prueba aquí una vez, en vez de depender de que cada slice lo re-verifique.
 */
import { describe, expect, it } from 'vitest';

import {
  firstFieldIssue,
  normalizeServiceError,
  resultError,
  resultOk,
  unwrapResult,
} from '@shared/result/result.pattern';

describe('resultOk / resultError', () => {
  it('envuelve los datos bajo `ok: true`', () => {
    expect(resultOk(42)).toEqual({ ok: true, data: 42 });
  });

  it('envuelve el error bajo `ok: false` sin campo `data`', () => {
    const result = resultError<string>({ statusCode: 404, message: 'no está' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.statusCode).toBe(404);
    expect('data' in result).toBe(false);
  });
});

describe('normalizeServiceError', () => {
  it('pasa un ServiceError ya normalizado sin tocarlo', () => {
    const error = { statusCode: 502, code: 'upstream_unreachable' };
    expect(normalizeServiceError(error)).toEqual(error);
  });

  it('entiende el shape del BFF: { status, code, message }', () => {
    const error = normalizeServiceError({ status: 404, code: 'agent_not_found', message: 'falta' });
    expect(error).toMatchObject({ statusCode: 404, code: 'agent_not_found', message: 'falta' });
  });

  it('resuelve el primer campo de un 422 con `details` estilo zod', () => {
    const error = normalizeServiceError({
      status: 422,
      details: [{ path: ['agentId'], message: 'requerido' }],
    });
    expect(error.field).toBe('agentId');
    expect(error.message).toBe('requerido');
  });

  it('resuelve el primer campo de un 422 con `metadata` estilo validate-fields', () => {
    const error = normalizeServiceError({
      status: 422,
      metadata: [{ field: 'model', message: 'inválido' }],
    });
    expect(error.field).toBe('model');
  });

  it('traduce un AbortError a 499 cancelado, no a un fallo de sistema', () => {
    const error = normalizeServiceError(new DOMException('aborted', 'AbortError'));
    expect(error).toMatchObject({ statusCode: 499, code: 'aborted' });
  });

  it('traduce un TimeoutError de `AbortSignal.timeout()` a 504', () => {
    const error = normalizeServiceError(new DOMException('timeout', 'TimeoutError'));
    expect(error).toMatchObject({ statusCode: 504, code: 'upstream_timeout' });
  });

  it('cae a 500 con un Error genérico y conserva el original en `raw`', () => {
    const original = new Error('boom');
    const error = normalizeServiceError(original);
    expect(error.statusCode).toBe(500);
    expect(error.message).toBe('boom');
    expect(error.raw).toBe(original);
  });

  it('acepta un Response y usa su status como código de estado', async () => {
    const response = new Response('sin cuerpo', { status: 503, statusText: 'Unavailable' });
    expect(normalizeServiceError(response).statusCode).toBe(503);
    await Promise.resolve();
  });

  it('no revienta con basura que no es objeto', () => {
    expect(normalizeServiceError('texto suelto').statusCode).toBe(500);
    expect(normalizeServiceError(undefined).statusCode).toBe(500);
  });
});

describe('firstFieldIssue', () => {
  it('devuelve undefined si el payload no es un array', () => {
    expect(firstFieldIssue({ nope: true })).toBeUndefined();
  });

  it('salta entradas sin campo resoluble', () => {
    expect(firstFieldIssue([{ message: 'sin campo' }, { field: 'ok' }])).toEqual({
      field: 'ok',
      message: undefined,
    });
  });
});

describe('unwrapResult', () => {
  it('da los datos si fue bien y el fallback si falló', () => {
    expect(unwrapResult(resultOk([1]), [])).toEqual([1]);
    expect(unwrapResult(resultError<number[]>({ statusCode: 500 }), [])).toEqual([]);
  });
});
