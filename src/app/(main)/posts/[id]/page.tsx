'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { ArrowLeft, Clock, ShieldX } from 'lucide-react';
import { Card, EmptyState, Skeleton } from '@/shared/components';
import { FeedPost, usePermalinkBackLink, usePost } from '@/features/newsfeed';
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
 *
 * `?new=1` IS THE COMPOSER LANDING HERE, and all it now does is ask this page to KEEP LOOKING.
 * `POST /v1/api/posts` answers with the new post's id and its `moderationStatus` (B39, closed),
 * so the composer pushes a real permalink and the state on screen is read from the post itself:
 * `PENDING_MODERATION` right after writing means the AI check has not run yet — a second or two —
 * so the page holds a skeleton and re-reads; `PENDING_REVIEW` and `REJECTED` are resting states
 * and each says so in its own words.
 *
 * THE STATUS IS ONLY EVER NON-`APPROVED` FOR THE AUTHOR: `PostVisibilityService` 404s an
 * uncleared post to everyone else, so no authorship check is needed here — and an author who
 * opens their own pending post from their profile now gets the same honest notice as one who
 * arrives straight from the composer.
 */
export default function PostPermalinkPage() {
  // `useSearchParams` needs a Suspense boundary in the App Router — same shape as `/newsfeed`.
  return (
    <Suspense>
      <PostPermalinkContent />
    </Suspense>
  );
}

function PostPermalinkContent() {
  const t = useT();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();

  const raw = Number(params?.id);
  const postId = Number.isInteger(raw) && raw > 0 ? raw : undefined;

  // Only a post its author has just written is re-read on a timer; every other visit is one GET.
  const justPosted = searchParams.get('new') === '1';
  const {
    data: post,
    isPending,
    isError,
    refetch,
  } = usePost(postId, { watchModeration: justPosted });

  /**
   * Null on feed rows written before the field existed — treated as approved, which is what an
   * entry that reached the cache at all must have been.
   */
  const status = post?.moderationStatus ?? 'APPROVED';

  /**
   * WHERE THE `←` GOES, and it is no longer always the feed. `usePermalinkBackLink` returns the
   * page the reader opened this post from — a profile, notifications, search — or, when that page
   * was the feed, the exact column they were reading (`/newsfeed?tab=<scope>`, which pairs with
   * `useScrollRestoration`). A permalink reached from a shared link or a notification, with no
   * origin recorded, falls back to the bare feed — the behaviour that predates this.
   *
   * `toFeed` DRIVES BOTH THE LABEL AND THE SCROLL. The word names the destination (an arrow means
   * "back", the word means "to where"), so a return to a profile cannot keep saying "Về bảng tin".
   * And only the feed link hands scroll to `useScrollRestoration` with `scroll={false}`; a return
   * to any other page takes the router's default scroll-to-top.
   */
  const { href: backHref, toFeed } = usePermalinkBackLink();

  const notFound = postId === undefined || isError || (!isPending && !post);
  /**
   * Hold the skeleton while the post loads, and — for a post its author has just written — while
   * the AI check is still the thing standing between it and the feed. Flashing "chờ kiểm duyệt"
   * for the second that check takes would describe the normal path as a problem.
   */
  const checking = !notFound && (isPending || (justPosted && status === 'PENDING_MODERATION'));
  const rejected = !notFound && !checking && status === 'REJECTED';
  const pendingReview =
    !notFound && !checking && (status === 'PENDING_REVIEW' || status === 'PENDING_MODERATION');

  return (
    /* THE BLOCK RUNG, NOT THE SECTION RUNG. `--nx-space-section` (40) is "section ↔ section
       within one canvas" — it separates two things that each stand on their own. This page has
       one section; the link above it is a way BACK OUT of the post, not a second section, and at
       40 it floated in the middle of nothing with the card starting well below the fold's first
       comfortable line. `--nx-space-block` (20) is the rung the feed already uses between the
       filter, the composer and every card, so the permalink now opens on the same rhythm as the
       screen it was reached from. */
    <div className="flex flex-col gap-[var(--nx-space-block)]">
      {/* `scroll={false}` — FOR A RETURN TO THE FEED ONLY — HANDS SCROLL TO `useScrollRestoration`.
          Next scrolls a forward navigation to the top, and it does so AFTER the destination has
          rendered — so the feed's restore ran, put the reader back at 2713, and the router then
          reset it to 0 a beat later. Measured. Telling the router not to scroll for that one case
          leaves exactly one thing setting the position, which is the hook that knows where the
          reader was. A return to a profile or search has no such hook, so it takes the router's
          default scroll-to-top like every other forward navigation. */}
      <Link
        href={backHref}
        scroll={toFeed ? false : undefined}
        className="inline-flex w-fit items-center gap-2 text-nx-body-sm text-nx-text-muted hover:text-nx-text-primary"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {toFeed ? t('post.backToFeed') : t('post.back')}
      </Link>

      {notFound ? (
        <EmptyState
          title={t('post.permalink.notFoundTitle')}
          description={t('post.permalink.notFoundDesc')}
        />
      ) : checking ? (
        <Card>
          <Skeleton lines={4} />
        </Card>
      ) : rejected && post ? (
        /* A RESTING STATE, AND THE ONE THE OLD GUESSWORK COULD NEVER REACH: a rejected post never
           enters the feed the check used to read, so it sat under "chờ kiểm duyệt" indefinitely.
           Saying it plainly is the difference between an author who can act and one who waits.
           THE NOTICE SITS ABOVE THE POST, NOT INSTEAD OF IT — deciding whether to appeal or
           rewrite means rereading what was actually written, the same reasoning
           `MyViolationsPanel` uses for `postExcerpt`. `PostVisibilityService` already returned
           the full `FeedPostDataDto` here (author-only bypass, see the file JSDoc); withholding
           it a second time in the UI only hid content the author is entitled to. Rendered via the
           same `FeedPost` the feed uses rather than a stripped preview, so nothing about the post
           — images, poll options, quiz body — needs a second rendering path just because it was
           rejected. */
        <>
          <Card className="flex flex-col items-center gap-[var(--nx-space-element)] px-4 py-10 text-center">
            <ShieldX className="size-8 text-nx-text-muted" aria-hidden />
            <div className="flex flex-col gap-[var(--nx-space-tight)]">
              <p className="text-nx-body font-semibold text-nx-text-primary">
                {t('post.rejected.title')}
              </p>
              <p className="text-nx-body-sm text-nx-text-secondary">{t('post.rejected.desc')}</p>
            </div>
          </Card>
          <FeedPost post={post} onChanged={() => refetch()} defaultCommentsOpen expanded />
        </>
      ) : pendingReview ? (
        /* NOT AN ERROR STATE. The post was saved and the author can see it — it just has not been
           cleared for an audience yet. A post the author just wrote keeps re-reading underneath
           this, so an approval that lands a few seconds later swaps the notice for the real post
           with no action from the reader. */
        <Card className="flex flex-col items-center gap-[var(--nx-space-element)] px-4 py-10 text-center">
          <Clock className="size-8 text-nx-text-muted" aria-hidden />
          <div className="flex flex-col gap-[var(--nx-space-tight)]">
            <p className="text-nx-body font-semibold text-nx-text-primary">
              {t('post.pendingReview.title')}
            </p>
            <p className="text-nx-body-sm text-nx-text-secondary">{t('post.pendingReview.desc')}</p>
          </div>
        </Card>
      ) : post ? (
        // Comments open on arrival: see `defaultCommentsOpen`. A permalink exists so that a
        // notification, a shared link or a skill's cited evidence has somewhere to land, and
        // in all three the discussion is what the reader came for.
        //
        // `expanded` FOR THE SAME REASON, ONE LAYER UP. The card's "Xem thêm" is a link to THIS
        // page, so rendering the feed's clamped card here left a long post cut behind a control
        // that navigated to the URL already on screen. This page is where the whole post lives.
        <FeedPost post={post} onChanged={() => refetch()} defaultCommentsOpen expanded />
      ) : null}
    </div>
  );
}
