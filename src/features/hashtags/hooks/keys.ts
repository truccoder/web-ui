/**
 * Query keys for `features/hashtags`.
 *
 * Two read-only lists that no write in this app invalidates — a tag's `usage_count` moves when
 * someone posts, but nothing here needs that to be live to the character. `staleTime` on the hooks
 * carries the freshness policy; these keys just separate one prefix (and one window) from another
 * so switching between them is a cache hit.
 */
export const hashtagKeys = {
  all: ['hashtags'] as const,
  suggest: (prefix: string) => ['hashtags', 'suggest', prefix] as const,
  trending: (window: string) => ['hashtags', 'trending', window] as const,
};
