import { describe, expect, it } from 'vitest';
import { followableLinks, isFollowableLink } from './explanation-links';

/**
 * The one real case this exists for is the last `it` in the first block: a URL the model broke
 * while generating. Everything else is the ordinary shape of an `ExternalLink`.
 */
describe('isFollowableLink', () => {
  it('accepts a plain https link with a real host', () => {
    expect(isFollowableLink({ url: 'https://www.baeldung.com/hibernate-n-plus-one-selects' })).toBe(
      true
    );
    expect(isFollowableLink({ url: 'http://example.org/a/b?c=d#e' })).toBe(true);
  });

  it('rejects a missing or blank url', () => {
    expect(isFollowableLink({ url: null })).toBe(false);
    expect(isFollowableLink({ url: '' })).toBe(false);
    expect(isFollowableLink({ url: '   ' })).toBe(false);
  });

  it('rejects a string that is not a URL', () => {
    expect(isFollowableLink({ url: 'see the Baeldung article on N+1' })).toBe(false);
    expect(isFollowableLink({ url: 'www.datadoghq.com/blog' })).toBe(false);
  });

  it('rejects a non-http(s) scheme', () => {
    expect(isFollowableLink({ url: 'ftp://files.example.com/x' })).toBe(false);
    expect(isFollowableLink({ url: 'javascript:alert(1)' })).toBe(false);
  });

  it('rejects a host with no dot', () => {
    expect(isFollowableLink({ url: 'http://localhost:8080/x' })).toBe(false);
  });

  it('rejects a url corrupted mid-generation (non-ASCII spliced into the path)', () => {
    // Observed 31/08/2026 in a real explanation payload.
    expect(
      isFollowableLink({
        url: 'https://www.datadoghq.com/blog/observability- படுகின்றன/p99-latency-vs-average-latency/',
      })
    ).toBe(false);
  });
});

describe('followableLinks', () => {
  it('drops the broken entries and keeps order', () => {
    const kept = followableLinks([
      { title: 'N+1', url: 'https://www.baeldung.com/hibernate-n-plus-one-selects', reason: null },
      { title: 'p99', url: 'https://www.datadoghq.com/blog/x- படுகின்றன/y/', reason: null },
      { title: 'Idempotency', url: 'https://restfulapi.net/idempotent-methods/', reason: 'why' },
    ]);
    expect(kept.map((l) => l.title)).toEqual(['N+1', 'Idempotency']);
  });

  it('is safe on null / undefined', () => {
    expect(followableLinks(null)).toEqual([]);
    expect(followableLinks(undefined)).toEqual([]);
  });
});
