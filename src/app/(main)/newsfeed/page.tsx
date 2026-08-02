'use client';

import { Newsfeed, useRefreshFeed } from '@/features/newsfeed';
import { PostComposer } from '@/features/posts';
import { useT } from '@/lib/i18n';

/**
 * `/newsfeed` — assembled at P3.1. Owning domain: `newsfeed`.
 *
 * FIVE DOMAINS MEET HERE AND THE PAGE MEDIATES NONE OF THEM. `newsfeed` owns the shell and the
 * payload; `posts` supplies the composer, the card and every body; `bookstore` the book controls;
 * `security` the signed-in identity that decides authorship; `reputation` the Elite Score chip.
 * Only the first two are imported by name in this file — the other three reach the screen through
 * `features/newsfeed` and `features/posts`, each via a barrel, which is exactly what §4 asks for.
 * A page that had to import all five would mean the features could not talk to each other, not
 * that the page was doing its job properly.
 *
 * THE ONE WIRE LEFT IS `onPosted`, and it is permanent rather than a seam waiting to close.
 * `features/posts` is write-only — five of its endpoints return `void` and there is no
 * `GET /posts/{id}` — so its mutations cannot hand back a post to splice in. They also refuse to
 * invalidate `newsfeedKeys` themselves: hardcoding another domain's key inside `posts` is exactly
 * what the extraction test forbids. So the composing screen connects the two, which is the job a
 * composing screen exists for.
 *
 * WHAT CHANGED AT P3.1: this page used to import `newsfeedKeys` and call `invalidateQueries`
 * itself. That is cache wiring rather than composition — `useRefreshFeed` now owns the key inside
 * the feature, and the page only says that something changed.
 */
export default function NewsfeedPage() {
  const t = useT();
  const refreshFeed = useRefreshFeed();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div>
        <h1 className="text-nx-h2 font-semibold tracking-tight text-nx-text-primary">
          {t('newsfeed.title')}
        </h1>
        <p className="mt-0.5 text-nx-body-sm text-nx-text-secondary">{t('newsfeed.subtitle')}</p>
      </div>

      <PostComposer onPosted={refreshFeed} />

      <Newsfeed />
    </div>
  );
}
