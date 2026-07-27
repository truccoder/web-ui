'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Newsfeed, newsfeedKeys } from '@/features/newsfeed';
import { PostComposer } from '@/features/posts';
import { BookPostActions } from '@/components/posts/book-post-actions';
import { useT } from '@/lib/i18n';

/**
 * `/newsfeed` — owned by `newsfeed`, with `posts` and `bookstore` contributing. The full
 * multi-domain assembly is P3.1; this is the composition P2.5 leaves behind.
 *
 * WHY THE PAGE STILL HOLDS TWO WIRES, and what closes each:
 *
 *  - `onPosted` → `newsfeedKeys.feed()`. `features/posts` is write-only (five of its endpoints
 *    return `void`, and there is no `GET /posts/{id}`), so its mutations deliberately refuse to
 *    invalidate another domain's cache — that would hardcode this feature's key inside posts
 *    and fail the extraction test (CLAUDE.md §4). They take an `onSuccess` from the composing
 *    screen instead, which is this. Permanent, not a seam: the dependency points
 *    newsfeed → posts, which is the direction that is allowed.
 *
 *  - `renderBookActions` → the legacy `BookPostActions`. Buy / preview / reviews belong to
 *    `bookstore` (P2.10) and its only implementation is still the bridge under
 *    `src/components/posts/`. `features/newsfeed` must not import that path, so the page — the
 *    one place allowed to know about both — passes it down. AT P2.10: swap this for
 *    `features/bookstore`'s component, or let the feed import it through that barrel and drop
 *    the prop.
 */
export default function NewsfeedPage() {
  const t = useT();
  const queryClient = useQueryClient();

  const refreshFeed = () => {
    queryClient.invalidateQueries({ queryKey: newsfeedKeys.feed() });
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div>
        <h1 className="text-nx-h2 font-semibold tracking-tight text-nx-text-primary">
          {t('newsfeed.title')}
        </h1>
        <p className="mt-0.5 text-nx-body-sm text-nx-text-secondary">{t('newsfeed.subtitle')}</p>
      </div>

      <PostComposer onPosted={refreshFeed} />

      <Newsfeed renderBookActions={(book) => <BookPostActions book={book} />} />
    </div>
  );
}
