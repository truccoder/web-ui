import { AxiosError, AxiosHeaders } from 'axios';
import { describe, expect, it } from 'vitest';
import { getErrorDetails, getErrorMessage, getErrorStatus } from './api-error';

/**
 * READING THIS BACKEND'S ERROR SHAPE. The split these functions encode is not a general HTTP
 * fact — it is a property of one Spring exception handler, measured across three controllers:
 * a bean-validation failure is a **422** whose `message` is the useless generic "Invalid request
 * parameters or payload" and whose `details` carries the readable per-field strings, while a
 * malformed body is a **400** with `details: null` that can never name a field.
 *
 * An empty `getErrorDetails` result is therefore a SIGNAL, not an absence: it tells the caller
 * this failure cannot be attributed to one input and it should fall back to `getErrorMessage`.
 * Every caller in the app depends on that, so it is asserted here for both statuses.
 */

/** An AxiosError carrying a response, built the way axios itself would. */
function responseError(status: number, data: unknown): AxiosError {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, null, {
    status,
    statusText: '',
    headers: {},
    config,
    data,
  } as never);
}

/** A request that never got a response — no network, DNS failure, timeout. */
function networkError(message = 'Network Error'): AxiosError {
  return new AxiosError(message, 'ERR_NETWORK', { headers: new AxiosHeaders() });
}

describe('getErrorMessage', () => {
  it("prefers the backend's own message", () => {
    const error = responseError(409, { message: 'Book already purchased' });
    expect(getErrorMessage(error)).toBe('Book already purchased');
  });

  it('falls through to the Error message when the response carries no message', () => {
    expect(getErrorMessage(networkError('Network Error'))).toBe('Network Error');
  });

  it('falls through when the response body has no message field', () => {
    const error = responseError(500, { details: null });
    expect(getErrorMessage(error)).toBe('Request failed');
  });

  it('uses the supplied fallback for a thrown value that is not an Error', () => {
    expect(getErrorMessage('a bare string', 'Không tải được')).toBe('Không tải được');
    expect(getErrorMessage(null, 'Không tải được')).toBe('Không tải được');
    expect(getErrorMessage(undefined, 'Không tải được')).toBe('Không tải được');
  });

  it('reads a plain Error thrown by anything that is not axios', () => {
    expect(getErrorMessage(new Error('boom'))).toBe('boom');
  });

  /** An Error with an empty message must not produce an empty label. */
  it('does not return an empty string when the Error has no message', () => {
    expect(getErrorMessage(new Error(''), 'Không tải được')).toBe('Không tải được');
  });
});

describe('getErrorStatus', () => {
  it('reports the status a rejected request came back with', () => {
    expect(getErrorStatus(responseError(422, {}))).toBe(422);
    expect(getErrorStatus(responseError(404, {}))).toBe(404);
  });

  /**
   * `undefined` distinguishes "never reached the server" from any status, which is what lets a
   * surface put its own copy in front of one class of failure and fall back for the rest.
   */
  it('reports undefined when the request never got a response', () => {
    expect(getErrorStatus(networkError())).toBeUndefined();
  });

  it('reports undefined for anything that is not an axios error', () => {
    expect(getErrorStatus(new Error('boom'))).toBeUndefined();
    expect(getErrorStatus('a bare string')).toBeUndefined();
  });
});

describe('getErrorDetails', () => {
  /** The 422 case: the useful part is in `details`, not in `message`. */
  it('returns the per-field messages from a validation failure', () => {
    const error = responseError(422, {
      message: 'Invalid request parameters or payload',
      details: ['Property rating: must be less than or equal to 5'],
    });
    expect(getErrorDetails(error)).toEqual(['Property rating: must be less than or equal to 5']);
  });

  it('returns every message when several fields failed', () => {
    const error = responseError(422, { details: ['Property a: required', 'Property b: too long'] });
    expect(getErrorDetails(error)).toHaveLength(2);
  });

  /** The 400 case: an empty result is the signal to fall back to `getErrorMessage`. */
  it('returns an empty array for a malformed body, which carries details: null', () => {
    const error = responseError(400, { message: 'Malformed JSON', details: null });
    expect(getErrorDetails(error)).toEqual([]);
  });

  it('returns an empty array when details is absent entirely', () => {
    expect(getErrorDetails(responseError(500, { message: 'Server error' }))).toEqual([]);
  });

  /** `details` is typed `unknown` because the handler is not obliged to send strings. */
  it('drops non-string entries rather than rendering them', () => {
    const error = responseError(422, { details: ['Property a: required', 42, null, { b: 1 }] });
    expect(getErrorDetails(error)).toEqual(['Property a: required']);
  });

  it('returns an empty array when details is an object rather than an array', () => {
    expect(getErrorDetails(responseError(422, { details: { rating: 'too big' } }))).toEqual([]);
  });

  it('returns an empty array for a request that never got a response', () => {
    expect(getErrorDetails(networkError())).toEqual([]);
  });

  it('returns an empty array for anything that is not an axios error', () => {
    expect(getErrorDetails(new Error('boom'))).toEqual([]);
  });
});
