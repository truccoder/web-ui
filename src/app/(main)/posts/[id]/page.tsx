'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Card, EmptyState, Skeleton } from '@/shared/components';
import { FeedPost, usePost } from '@/features/newsfeed';
import { useT } from '@/core/i18n';

/**
 * `/posts/{id}` — one post, on its own page.
 *
 * THE PRODUCT HAD NO WAY TO LINK TO A POST. `GET /posts/{postId}` existed and had no frontend
 * caller, so every post lived only inside a scrolling list: you could not send one to anyone, a
 * notification about a post could not open it, and a post cited as evidence for a skill had no
 * address. That is a strange gap for an app whose whole argument is that posts ARE the evidence.
 *
 * IT RENDERS THE SAME `FeedPost` AS THE FEED, because the endpoint answers the same
 * `FeedPostDataDto`. A permalink-specific card would be a second place for the reaction bar, the
 * menu, the comment thread and every type-specific body to drift — and the one thing a permalink
 * must do is show exactly what the feed showed.
 *
 * 404 MEANS TWO THINGS AND THE PAGE MUST NOT PICK ONE. The backend answers 404 both for a post
 * that was deleted and for one this reader may not see — deliberately, so the endpoint cannot be
 * used to probe what exists. So the empty state says the post is not available, and does not say
 * it was removed.
 */
export default function PostPermalinkPage() {
  const t = useT();
  const params = useParams<{ id: string }>();

  const raw = Number(params?.id);
  const postId = Number.isInteger(raw) && raw > 0 ? raw : undefined;

  const { data: post, isPending, isError, refetch } = usePost(postId);

  return (
    <div className="flex flex-col gap-[var(--nx-space-section)]">
      {/* `scroll={false}` HANDS SCROLL TO `useScrollRestoration`.
          Next scrolls a forward navigation to the top, and it does so AFTER the destination has
          rendered — so the feed's restore ran, put the reader back at 2713, and the router then
          reset it to 0 a beat later. Measured. Telling the router not to scroll for this one link
          leaves exactly one thing setting the position, which is the hook that knows where the
          reader was. Every other link into the feed keeps the default. */}
      <Link
        href="/newsfeed"
        scroll={false}
        className="inline-flex w-fit items-center gap-2 text-nx-body-sm text-nx-text-muted hover:text-nx-text-primary"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {t('post.backToFeed')}
      </Link>

      {postId === undefined || isError || (!isPending && !post) ? (
        <EmptyState
          title={t('post.permalink.notFoundTitle')}
          description={t('post.permalink.notFoundDesc')}
        />
      ) : isPending ? (
        <Card>
          <Skeleton lines={4} />
        </Card>
      ) : (
        // Comments open on arrival: see `defaultCommentsOpen`. A permalink exists so that a
        // notification, a shared link or a skill's cited evidence has somewhere to land, and
        // in all three the discussion is what the reader came for.
        <FeedPost post={post} onChanged={() => refetch()} defaultCommentsOpen />
      )}
    </div>
  );
}
