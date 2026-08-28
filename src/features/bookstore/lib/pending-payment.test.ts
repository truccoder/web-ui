import { describe, expect, it } from 'vitest';
import {
  extractOrderId,
  isPendingPaymentFresh,
  parsePendingPayments,
  PENDING_PAYMENT_TTL_MS,
  type PendingPayment,
} from './pending-payment';

/**
 * THE TWO PARTS OF THIS MODULE THAT MEET INPUT NOBODY HERE WROTE.
 *
 * `parsePendingPayments` reads `localStorage`, which any script on this origin can write and which
 * outlives every version of this code, so it must treat its own storage as untrusted. And
 * `extractOrderId` reads a SENTENCE from the backend — the one place in this codebase allowed to,
 * and only because the cost of a rephrase is a missing shortcut rather than a wrong state.
 *
 * The store itself (`getPendingPayments`, `rememberPendingPayment`) is not tested here: it needs a
 * `Storage` and a `window`, and this suite runs in `environment: 'node'` on purpose — see
 * `vitest.config.mts` for why component and DOM tests are not this file's job.
 */

const fresh: PendingPayment = {
  bookId: 7,
  transactionRef: 'MOMO1787752475445-ffa1853',
  paymentUrl: 'https://test-payment.momo.vn/pay/x',
  startedAt: 1_700_000_000_000,
  recovered: false,
};

describe('parsePendingPayments', () => {
  it('returns nothing for empty, malformed or non-array storage', () => {
    expect(parsePendingPayments(null)).toEqual([]);
    expect(parsePendingPayments('')).toEqual([]);
    expect(parsePendingPayments('{not json')).toEqual([]);
    expect(parsePendingPayments('{"bookId":7}')).toEqual([]);
    expect(parsePendingPayments('"a string"')).toEqual([]);
  });

  it('keeps a well-formed entry unchanged', () => {
    expect(parsePendingPayments(JSON.stringify([fresh]))).toEqual([fresh]);
  });

  /**
   * THE CASE THE FILTER EXISTS FOR. One bad entry among good ones must not take the list with it,
   * and must not reach a component that will read `.transactionRef` off it and build a URL.
   */
  it('drops entries that are not shaped like a payment, keeping the rest', () => {
    const raw = JSON.stringify([{ bookId: 'seven' }, null, 42, fresh, { transactionRef: 'x' }]);
    expect(parsePendingPayments(raw)).toEqual([fresh]);
  });

  it('reads a missing `recovered` flag as recovered, which is the branch that keeps Buy', () => {
    const legacy = JSON.stringify([{ ...fresh, recovered: undefined }]);
    expect(parsePendingPayments(legacy)[0].recovered).toBe(true);
  });

  it('normalises a missing paymentUrl to null rather than undefined', () => {
    const raw = JSON.stringify([{ ...fresh, paymentUrl: null }]);
    expect(parsePendingPayments(raw)[0].paymentUrl).toBeNull();
  });
});

describe('isPendingPaymentFresh', () => {
  it('is true inside the window and false on or after its edge', () => {
    expect(isPendingPaymentFresh(fresh, fresh.startedAt)).toBe(true);
    expect(isPendingPaymentFresh(fresh, fresh.startedAt + PENDING_PAYMENT_TTL_MS - 1)).toBe(true);
    expect(isPendingPaymentFresh(fresh, fresh.startedAt + PENDING_PAYMENT_TTL_MS)).toBe(false);
  });
});

describe('extractOrderId', () => {
  /** The backend's sentence, copied from `MomoService.createPayment` character for character. */
  it('lifts the ref out of the rejection that names one', () => {
    const message =
      'A payment for this book is already in progress (orderId=MOMO1787752475445-ffa1853). ' +
      'Please complete it, or try again in a few minutes if it expired.';
    expect(extractOrderId(message)).toBe('MOMO1787752475445-ffa1853');
  });

  /**
   * The other two sentences 400 covers on this endpoint. Neither names an order, and neither may
   * produce one — a fabricated ref would give the reader a button that only ever answers 404.
   */
  it('returns null for the rejections that carry no order', () => {
    expect(extractOrderId('This book is free, no payment required')).toBeNull();
    expect(extractOrderId('Cannot purchase your own book')).toBeNull();
    expect(extractOrderId('')).toBeNull();
  });

  it('stops at the closing parenthesis rather than swallowing the rest of the sentence', () => {
    expect(extractOrderId('(orderId=ABC-1). Please complete it')).toBe('ABC-1');
  });
});
