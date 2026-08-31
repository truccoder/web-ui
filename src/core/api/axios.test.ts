import { describe, expect, it } from 'vitest';
import { isAllowedWithoutSession, pathOf } from './axios';

/**
 * THE GUEST ALLOW-LIST. This is the rule that decides what the app may put on the wire with no
 * session behind it, and it is written entirely in regular expressions — the shape of code that
 * is wrong in ways reading does not reveal.
 *
 * The list is a transcription of the backend's `SecurityConfig`, so a test here proves only that
 * this side matches what it was written to match. It cannot prove the two agree; that is what the
 * `chromium-guest` Playwright project is for. What it does prove is the property the
 * transcription relies on: THIS SIDE CAN ONLY EVER BE NARROWER. Every widening below — a wrong
 * anchor, a greedy segment, a query string read as a path — is a request leaving without a
 * session that the backend would refuse, and `axios.ts` says that failure mode must not happen.
 */

/** The six patterns in `GUEST_READABLE`, one representative path each. */
const GUEST_READABLE_PATHS = [
  '/v1/api/posts/public',
  '/v1/api/posts/42',
  '/v1/api/users/thinh/profile',
  '/v1/api/users/thinh/posts',
  '/v1/api/users/thinh/reputation',
  '/v1/api/users/thinh/roadmap-progress',
  '/v1/api/github/stats/octocat',
  '/v1/api/books/author/thinh',
  '/v1/api/trending',
];

describe('pathOf', () => {
  it('returns a relative path unchanged', () => {
    expect(pathOf('/v1/api/posts/42')).toBe('/v1/api/posts/42');
  });

  it('strips the origin from an absolute URL', () => {
    expect(pathOf('http://localhost:8080/v1/api/posts/42')).toBe('/v1/api/posts/42');
    expect(pathOf('https://api.example.com/v1/api/trending')).toBe('/v1/api/trending');
  });

  it('strips the query string', () => {
    expect(pathOf('/v1/api/trending?page=2&size=10')).toBe('/v1/api/trending');
  });

  it('strips the fragment', () => {
    expect(pathOf('/v1/api/posts/42#comments')).toBe('/v1/api/posts/42');
  });

  /**
   * THE CASE THE FUNCTION EXISTS FOR. Without the split, `/v1/api/users/me/settings?next=/profile`
   * still contains `/profile`, and the `users/[^/]+/(profile|…)` pattern matches it — a gated
   * endpoint sent without a session because someone appended a query.
   */
  it('does not let a query string carry a matching segment into the path', () => {
    expect(pathOf('/v1/api/users/me/settings?next=/profile')).toBe('/v1/api/users/me/settings');
    expect(pathOf('/v1/api/users/me/settings#/profile')).toBe('/v1/api/users/me/settings');
  });
});

describe('isAllowedWithoutSession', () => {
  describe('auth endpoints', () => {
    it('allows every method, because they are how a session is obtained', () => {
      for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
        expect(isAllowedWithoutSession(method, '/v1/api/auth/login')).toBe(true);
        expect(isAllowedWithoutSession(method, '/v1/api/auth/refresh')).toBe(true);
      }
    });

    /** The pattern is anchored with a trailing slash: `/auth` alone is not the auth surface. */
    it('does not allow a path that merely starts with the word', () => {
      expect(isAllowedWithoutSession('post', '/v1/api/authors')).toBe(false);
      expect(isAllowedWithoutSession('post', '/v1/api/auth')).toBe(false);
    });
  });

  describe('the guest-readable surface', () => {
    it.each(GUEST_READABLE_PATHS)('allows GET %s', (path) => {
      expect(isAllowedWithoutSession('get', path)).toBe(true);
    });

    it.each(GUEST_READABLE_PATHS)('allows %s regardless of method casing', (path) => {
      expect(isAllowedWithoutSession('GET', path)).toBe(true);
    });

    it.each(GUEST_READABLE_PATHS)('allows %s as an absolute URL with a query', (path) => {
      expect(isAllowedWithoutSession('get', `http://localhost:8080${path}?page=1`)).toBe(true);
    });

    /**
     * GET-ONLY IS HALF THE RULE. Reading these anonymously is permitted; writing to them is not,
     * and `POST /v1/api/posts/42` is a comment on a post whose GET is public.
     */
    it.each(GUEST_READABLE_PATHS)('refuses a write to %s', (path) => {
      for (const method of ['post', 'put', 'patch', 'delete']) {
        expect(isAllowedWithoutSession(method, path)).toBe(false);
      }
    });
  });

  describe('paths that are one segment away from allowed', () => {
    /** Each pattern is pinned to one path segment exactly as the backend's matchers are. */
    const refused: ReadonlyArray<readonly [string, string]> = [
      // `posts/\d+` is digits only, and only one segment of them.
      ['/v1/api/posts/42a', 'a post id that is not a number'],
      ['/v1/api/posts/42/comments', 'a sub-resource of a readable post'],
      ['/v1/api/posts/42/reactions', 'another sub-resource'],
      ['/v1/api/posts', 'the un-suffixed collection'],
      ['/v1/api/posts/publicity', 'a longer word starting with the allowed one'],
      // `users/[^/]+/(profile|posts|reputation|roadmap-progress)` — the tail is a whole segment.
      ['/v1/api/users/thinh/profileXX', 'a longer tail than the pattern names'],
      ['/v1/api/users/thinh/settings', 'a tail the backend does not open'],
      ['/v1/api/users/thinh/profile/edit', 'a sub-resource under an allowed tail'],
      ['/v1/api/users/thinh', 'the user itself'],
      ['/v1/api/users/me/profile/../settings', 'a traversal in the path'],
      // The remaining three.
      ['/v1/api/github/stats', 'stats with no username'],
      ['/v1/api/books/author', 'author with no username'],
      ['/v1/api/books/42', 'a book by id'],
      ['/v1/api/trending/sources', 'a sub-resource of trending'],
      ['/v1/api/trendingx', 'a longer word than trending'],
      // Nothing else in the app.
      ['/v1/api/notifications', 'an unrelated gated endpoint'],
      ['/v1/api/users/me/profile-picture', 'a hyphenated neighbour of an allowed tail'],
    ];

    it.each(refused)('refuses GET %s (%s)', (path) => {
      expect(isAllowedWithoutSession('get', path)).toBe(false);
    });
  });

  describe('the smuggling case', () => {
    /**
     * These are the reason `pathOf` splits on `?` and `#` before matching. Each is a GATED path
     * carrying an ALLOWED segment somewhere a naive matcher would still find it.
     */
    it('refuses a gated path whose query contains an allowed segment', () => {
      expect(isAllowedWithoutSession('get', '/v1/api/users/me/settings?next=/profile')).toBe(false);
      expect(isAllowedWithoutSession('get', '/v1/api/notifications?ref=/v1/api/trending')).toBe(
        false
      );
      expect(isAllowedWithoutSession('get', '/v1/api/admin/users?q=/v1/api/posts/1')).toBe(false);
    });

    it('refuses a gated path whose fragment contains an allowed segment', () => {
      expect(isAllowedWithoutSession('get', '/v1/api/users/me/settings#/profile')).toBe(false);
    });

    it('refuses a gated path on another origin', () => {
      expect(
        isAllowedWithoutSession('get', 'http://evil.example.com/v1/api/users/me/settings')
      ).toBe(false);
    });
  });
});
