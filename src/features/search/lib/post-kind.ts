import type { SearchPost } from '../types/search';

/**
 * What a search result post IS, for the Posts tab's type filter.
 *
 * `PostDto` in a search payload carries no `postType` (see `post-result-card.tsx`), so the kind
 * has to be read back from which block came through non-null — a post has at most one. The order
 * here is the priority a post with more than one populated field would be filed under: a book
 * post and an event post are those things first, whatever text also rides along.
 *
 * The values are the keys of `createPost.type.*` — the same table the composer's type menu
 * labels itself from — so a caller labels a filter option with `t('createPost.type.' + kind)`
 * and never needs a second table.
 */
export type SearchPostKind =
  | 'REGULAR'
  | 'CODE_SNIPPET'
  | 'ARTICLE'
  | 'QNA'
  | 'POLL'
  | 'LINK'
  | 'EVENT'
  | 'BOOK';

export function derivePostKind(post: SearchPost): SearchPostKind {
  if (post.book != null) return 'BOOK';
  if (post.eventName != null) return 'EVENT';
  if (post.codeSnippetDetails != null) return 'CODE_SNIPPET';
  if (post.articleDetails != null) return 'ARTICLE';
  if (post.qnaDetails != null) return 'QNA';
  if (post.pollDetails != null) return 'POLL';
  if (post.linkDetails != null) return 'LINK';
  return 'REGULAR';
}

/** The kinds actually present in a result set, in the `SearchPostKind` order above. */
export function presentPostKinds(posts: SearchPost[]): SearchPostKind[] {
  const order: SearchPostKind[] = [
    'REGULAR',
    'CODE_SNIPPET',
    'ARTICLE',
    'QNA',
    'POLL',
    'LINK',
    'EVENT',
    'BOOK',
  ];
  const seen = new Set(posts.map(derivePostKind));
  return order.filter((kind) => seen.has(kind));
}
