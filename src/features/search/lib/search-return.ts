/**
 * The way back to a set of search results.
 *
 * A result opened from `/search` leads to `/projects/{id}` or `/roadmap?id=`, and the back
 * control there used to point at the project board / roadmap index — dropping the query and the
 * tab the reader had been on. B33's follow-up: the outbound link carries the results URL as
 * `?backTo=`, and the destination's back control reads it back.
 *
 * STATELESS ON PURPOSE. `sessionStorage` would go stale the moment the same detail page is
 * reached from somewhere else. A query param cannot: a link with no `backTo` gets the default
 * parent, a shared link just carries a back button aimed at a search — and `safeBackTo` pins it
 * to `/search?` so it can never become an open redirect.
 */
export const BACK_TO_PARAM = 'backTo';

/** The results URL to return to — `q` always, `tab` only when it is not the default `all`. */
export function buildSearchReturn(query: string, tab: string): string {
  const params = new URLSearchParams({ q: query });
  if (tab && tab !== 'all') params.set('tab', tab);
  return `/search?${params.toString()}`;
}

/** Append `?backTo=<results url>` to an outbound result link. */
export function withBackTo(href: string, backTo: string): string {
  const sep = href.includes('?') ? '&' : '?';
  return `${href}${sep}${BACK_TO_PARAM}=${encodeURIComponent(backTo)}`;
}

/** Honour a `backTo` value only when it points back into `/search` — never an arbitrary path. */
export function safeBackTo(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.startsWith('/search?') ? value : null;
}
