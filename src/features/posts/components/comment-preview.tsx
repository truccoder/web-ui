'use client';

import * as React from 'react';
import Link from 'next/link';
import { Avatar, Skeleton } from '@/shared/components';
import { useRelativeTime } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';
import { useT } from '@/core/i18n';
import { groupComments, useComments } from '../hooks/use-comment';

/**
 * The two comments a feed card shows, and the way into the rest.
 *
 * WHAT WAS ASKED FOR AND WHAT IS ACTUALLY BUILDABLE — the gap is worth stating before the code,
 * because the shape looks like the familiar one and the ordering is not.
 *
 * The request was "show the one or two most-liked comments". **`CommentResponseDto` has no likes.**
 * Its nine fields are `id · postId · authorId · authorFullName · authorProfilePictureUrl ·
 * content · parentId · createdAt · updatedAt`, and `CommentController` has exactly two routes —
 * the list and one comment — with no reaction path under either. There is nothing on a comment to
 * rank by, and inventing a rank (length, recency dressed up as popularity) would be a number that
 * looks like a measurement and is not one. Filed as **B14** in `docs/backend-plan.md`.
 *
 * SO THE PREVIEW IS THE FIRST TWO TOP-LEVEL COMMENTS, oldest first, which is the order the thread
 * itself uses. That is honest and it is also the useful half of the request: what a reader wants
 * from a preview is evidence that a discussion exists and a sense of its tone, and any two real
 * comments give both. Ranking would only change WHICH two.
 *
 * IT DOES NOT FETCH UNTIL THE CARD IS ON SCREEN. `CommentThread`'s own note explains why this
 * matters: the thread fetches on mount, and a feed of twenty cards that all mounted one would
 * fire twenty comment requests on load. An `IntersectionObserver` gates the query, so the cost is
 * bounded by what the reader has actually scrolled to; a card with `commentCount === 0` never
 * fetches at all, because the feed payload already told us there is nothing to preview.
 *
 * EVERYTHING HERE LINKS TO `/posts/{id}` — the rows and the "view all" line alike. Not a modal:
 * the permalink opens with the whole thread already expanded, so it is the full view, it has an
 * address, and it is the same destination "Xem thêm" uses on a long body. Two affordances on one
 * card that lead to two different presentations of the same thing is the confusion worth avoiding.
 */
export interface CommentPreviewProps {
  postId: number;
  /** From the feed payload. Zero means "do not fetch" rather than "fetch and find nothing". */
  commentCount?: number;
  className?: string;
}

/** How many top-level comments the card shows. Two is the request; one reads as an accident. */
const PREVIEW_COUNT = 2;

export function CommentPreview({ postId, commentCount, className }: CommentPreviewProps) {
  const t = useT();
  const relativeTime = useRelativeTime();
  const ref = React.useRef<HTMLDivElement>(null);
  const [visible, setVisible] = React.useState(false);

  const href = `/posts/${postId}`;
  const hasComments = (commentCount ?? 0) > 0;

  React.useEffect(() => {
    const element = ref.current;
    if (!element || !hasComments || visible) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Once is enough — this is a "has been seen" latch, not a visibility subscription, so the
        // observer disconnects rather than re-firing every time the card scrolls past.
        if (entries[0].isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [hasComments, visible]);

  const comments = useComments(visible ? postId : undefined);
  const roots = comments.data ? groupComments(comments.data) : [];
  const preview = roots.slice(0, PREVIEW_COUNT);

  if (!hasComments) return null;

  return (
    <div ref={ref} className={cn('flex flex-col gap-2', className)}>
      {comments.isPending && visible ? (
        // The skeleton is two rows because the preview is two rows — a single bar would promise a
        // different shape from the one that arrives.
        <>
          <Skeleton className="h-8 w-full rounded-nx-sm" />
          <Skeleton className="h-8 w-4/5 rounded-nx-sm" />
        </>
      ) : (
        preview.map((comment) => (
          <Link
            key={comment.id}
            href={href}
            className={cn(
              'flex w-full items-start gap-2 rounded-nx-sm p-1 text-left',
              'transition-colors duration-[var(--nx-duration-fast)] ease-nx-out',
              'hover:bg-nx-surface-hover',
              'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nx-focus-ring'
            )}
          >
            <Avatar
              src={comment.authorProfilePictureUrl ?? undefined}
              name={comment.authorFullName ?? undefined}
              size="xs"
              className="mt-0.5"
            />
            <span className="min-w-0 flex-1 text-nx-body-sm">
              <span className="font-medium text-nx-text-primary">
                {comment.authorFullName ?? t('post.comments.unknownAuthor')}
              </span>{' '}
              {/* `line-clamp-2` rather than the measured clamp `ExpandableBlock` uses: a preview
                  row is two lines by definition, so there is nothing to decide and no reason to
                  pay for a `ResizeObserver` on every comment of every card in the feed. */}
              <span className="line-clamp-2 text-nx-text-secondary">{comment.content}</span>
            </span>
            <span className="shrink-0 text-nx-caption text-nx-text-faint">
              {relativeTime(comment.createdAt)}
            </span>
          </Link>
        ))
      )}

      <Link
        href={href}
        className={cn(
          'w-fit text-nx-body-sm font-medium text-nx-text-link',
          'hover:text-nx-text-link-hover',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring'
        )}
      >
        {t('post.comments.viewAll', { count: commentCount ?? 0 })}
      </Link>
    </div>
  );
}
