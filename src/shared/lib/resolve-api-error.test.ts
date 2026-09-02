import { AxiosError, AxiosHeaders } from 'axios';
import { describe, expect, it } from 'vitest';
import { AuthRequiredError } from '@/core/api/axios';
import { resolveApiError } from './resolve-api-error';

/**
 * THE F4 SHEET, ASSERTED ONE ROW AT A TIME. The atlas maps every HTTP status the backend can
 * answer with to a UI response; `resolveApiError` is that table and this pins each row: which
 * `kind` a status produces, whether a retry is offered, and — for the three statuses where the
 * backend's own text is the useful part — that the text is carried through rather than replaced.
 *
 * Copy is NOT asserted (it is i18n keys the component resolves), the same way `format.test.ts`
 * refuses to pin CLDR wording. What is asserted is the routing decision, because that is the part
 * that is this code rather than a translation file.
 */

function responseError(status: number, data: unknown = {}): AxiosError {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, null, {
    status,
    statusText: '',
    headers: {},
    config,
    data,
  } as never);
}

function networkError(): AxiosError {
  return new AxiosError('Network Error', 'ERR_NETWORK', { headers: new AxiosHeaders() });
}

describe('resolveApiError', () => {
  it('routes a request that never got a response to the network kind, with retry', () => {
    const view = resolveApiError(networkError());
    expect(view.kind).toBe('network');
    expect(view.retryable).toBe(true);
  });

  it('routes an AuthRequiredError and a 401 to the same auth kind, no retry', () => {
    expect(resolveApiError(new AuthRequiredError('/v1/api/posts')).kind).toBe('auth');
    expect(resolveApiError(responseError(401)).kind).toBe('auth');
    expect(resolveApiError(responseError(401)).retryable).toBe(false);
  });

  it('routes a 403 with banDetails to the banned kind and carries the reason verbatim', () => {
    const view = resolveApiError(
      responseError(403, { banDetails: { reason: 'Repeated spam', bannedUntil: '2026-09-09' } })
    );
    expect(view.kind).toBe('banned');
    expect(view.tone).toBe('banner');
    expect(view.message).toBe('Repeated spam');
    expect(view.retryable).toBe(false);
  });

  it('routes a plain 403 to the forbidden kind, no retry', () => {
    const view = resolveApiError(responseError(403, { message: 'Forbidden' }));
    expect(view.kind).toBe('forbidden');
    expect(view.retryable).toBe(false);
  });

  it('routes a 404 to the notFound kind, no retry', () => {
    expect(resolveApiError(responseError(404)).kind).toBe('notFound');
    expect(resolveApiError(responseError(404)).retryable).toBe(false);
  });

  it('routes a 409 to the conflict kind, with retry', () => {
    const view = resolveApiError(responseError(409, { message: 'Already reviewed' }));
    expect(view.kind).toBe('conflict');
    expect(view.retryable).toBe(true);
  });

  it('routes a 422 to the invalid kind and carries the per-field details', () => {
    const view = resolveApiError(
      responseError(422, {
        message: 'Invalid request parameters or payload',
        details: ['Property rating: must be less than or equal to 5'],
      })
    );
    expect(view.kind).toBe('invalid');
    expect(view.details).toEqual(['Property rating: must be less than or equal to 5']);
    // The generic message is dropped when there are field messages to show instead.
    expect(view.message).toBeUndefined();
  });

  it('falls back to the message for a 422 that names no field', () => {
    const view = resolveApiError(responseError(422, { message: 'Invalid payload', details: null }));
    expect(view.kind).toBe('invalid');
    expect(view.details).toEqual([]);
    expect(view.message).toBe('Invalid payload');
  });

  it('routes a 428 to profileRequired with an onboarding href and no retry', () => {
    const view = resolveApiError(responseError(428));
    expect(view.kind).toBe('profileRequired');
    expect(view.href).toBe('/onboarding/professional');
    expect(view.retryable).toBe(false);
  });

  it('routes a 429 to rateLimited with NO retry', () => {
    expect(resolveApiError(responseError(429)).kind).toBe('rateLimited');
    expect(resolveApiError(responseError(429)).retryable).toBe(false);
  });

  it('routes a 503 to unavailable, with retry', () => {
    expect(resolveApiError(responseError(503)).kind).toBe('unavailable');
    expect(resolveApiError(responseError(503)).retryable).toBe(true);
  });

  it('routes a 400 to the generic kind and carries the backend message', () => {
    const view = resolveApiError(responseError(400, { message: 'Event is full' }));
    expect(view.kind).toBe('generic');
    expect(view.message).toBe('Event is full');
    expect(view.retryable).toBe(true);
  });

  it('leaves message undefined for a generic failure with no backend sentence', () => {
    expect(resolveApiError(responseError(500, {})).message).toBeUndefined();
    expect(resolveApiError(responseError(500, { message: 'Server error' })).message).toBe(
      'Server error'
    );
  });
});
