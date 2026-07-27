'use client';

import { useQueryClient } from '@tanstack/react-query';
import { PostComposer } from '@/features/posts';
import { Newsfeed } from '@/components/posts/newsfeed';
import { NEWSFEED_QUERY_KEY } from '@/lib/hooks/use-posts';
import { useT } from '@/lib/i18n';

/**
 * `/newsfeed` spans four domains (newsfeed, posts, bookstore, security) and is assembled for
 * real at P3.1. P2.4d only swapped the **composer** over to `features/posts`; the feed itself
 * and everything it renders is still legacy and stays that way until `newsfeed` is built (P2.5).
 *
 * THE `onPosted` SEAM IS TEMPORARY, AND THIS IS THE ONE PLACE THAT KNOWS IT.
 * `features/posts` is write-only — five of its endpoints return `void`, there is no
 * `GET /posts/{id}`, and the read side of a post lives in the feed. So the posts hooks refuse to
 * invalidate anything outside their own domain (that would hardcode another feature's cache and
 * fail the extraction test, CLAUDE.md §4) and take an `onSuccess` from the caller instead.
 *
 * The caller should be `features/newsfeed` calling `newsfeedKeys.feed()`. That module does not
 * exist yet — P2.5 has not started, and the feed query still lives in the legacy
 * `lib/hooks/use-posts.ts` under the flat key `['newsfeed']`. Until then this page holds the
 * seam and invalidates that key by importing the constant rather than repeating the string, so
 * that deleting the legacy hook at P2.5 breaks this import loudly instead of leaving a magic
 * string that silently stops matching. AT P2.5: replace `NEWSFEED_QUERY_KEY` with
 * `newsfeedKeys.feed()`, and this comment goes with it.
 *
 * The temporary event composer that sat below `PostComposer` is GONE as of P2.4″d:
 * `PostComposer` now covers all eight kinds, so the bridge had nothing left to bridge.
 */
export default function NewsfeedPage() {
  const t = useT();
  const queryClient = useQueryClient();

  const refreshFeed = () => {
    queryClient.invalidateQueries({ queryKey: NEWSFEED_QUERY_KEY });
  };

  return (
    <div className="space-y-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('newsfeed.title')}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{t('newsfeed.subtitle')}</p>
        </div>

        <PostComposer onPosted={refreshFeed} />

        <Newsfeed />
      </div>
    </div>
  );
}
