'use client';

import { useState } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import {
  ApiErrorNotice,
  Badge,
  Button,
  Card,
  EmptyState,
  Pagination,
  Select,
  Skeleton,
  Textarea,
} from '@/shared/components';
import { useT } from '@/core/i18n';
import { getErrorMessage } from '@/shared/lib/api-error';
import { usePagination } from '@/shared/lib/use-pagination';
import { useRelativeTime } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';
import { useModerationPosts, useReviewPost } from '../hooks/use-moderation';
import type { ModerationStatus, PostModerationDetail, ViolationType } from '../types/moderation';
import { ModerationFilters } from './moderation-filters';
import { ModerationLogRow } from './moderation-log-row';

/**
 * The review queue: posts awaiting a decision, with their history and the decision controls.
 *
 * TWO BUTTONS, NOT A SIX-POINT SCALE. `AdminReviewRequestDto.decision` is a `Likelihood` with six
 * members, and `reviewPost` reduces the whole thing to `isAtLeast(LIKELY)` and stores only
 * `APPROVED`/`REJECTED`. A six-way picker would ask a moderator to express a nuance the system
 * discards on arrival, so the buttons send the two unambiguous ends of the scale —
 * `VERY_UNLIKELY` to approve, `VERY_LIKELY` to reject. `findings/moderation.md` §2.
 *
 * REJECTING IS SAID OUT LOUD, because it is not a status change. It records a violation, two
 * violations ban the author for seven days, and that ban blocks `/auth/login` — a click here can
 * lock someone out of the product. The confirmation step exists for that reason and not as
 * general caution; approving has no confirmation because approving is reversible in effect
 * (the post simply becomes visible) and harms nobody.
 *
 * AND IT NAMES THE VIOLATION, which for a while it could not — REJECTION WAS OUTRIGHT IMPOSSIBLE
 * FROM THIS SCREEN. The backend began requiring `violationType` on a rejecting decision (it used
 * to hardcode `HATE_SPEECH` for every rejection, so removing spam filed a critical hate-speech
 * violation against its author, and the author is shown that reason). This screen was never given
 * the field, so every press of `Từ chối` answered **400 `violationType is required when rejecting
 * a post`** — with no control anywhere on the page that could satisfy it. Measured 02/09 on a
 * `PENDING_REVIEW` post; the eight posts sitting in the seeded queue could not be decided at all.
 *
 * NO DEFAULT, AND THE CONFIRM STAYS DISABLED UNTIL ONE IS PICKED. A pre-selected type would be
 * the same mistake the hardcoded one was, in a nicer place: the value is written into the
 * author's violation record and shown to them, so a wrong one is a false accusation, and the
 * difference between `SPAM` and `HATE_SPEECH` is the difference between a nuisance and a
 * seven-day ban (`UserBanService.determineSeverity`).
 */
export interface ModerationPostsTabProps {
  /** Pre-fills the post-id filter, e.g. when arriving from a banned user's triggering post. */
  initialPostId?: number;
  className?: string;
}

const PAGE_SIZE = 10;

/** The nine `ViolationType` members, in the Java enum's own order. */
const VIOLATION_TYPES = [
  'SPAM',
  'HATE_SPEECH',
  'NSFW',
  'SEXUALLY_EXPLICIT',
  'VIOLENCE',
  'THREAT',
  'INSULT',
  'KEYWORD_BLACKLIST',
  'DUPLICATE_CONTENT',
] as const satisfies readonly ViolationType[];

function PostReviewCard({ post }: { post: PostModerationDetail }) {
  const t = useT();
  const relativeTime = useRelativeTime();

  const [historyOpen, setHistoryOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [confirmingReject, setConfirmingReject] = useState(false);
  const [violationType, setViolationType] = useState<ViolationType | ''>('');

  const review = useReviewPost();

  // Only a PENDING_REVIEW post can be decided; anything else answers 409. The controls are hidden
  // rather than disabled, because on a filtered list most rows are simply not decisions to make.
  const canReview = post.currentStatus === 'PENDING_REVIEW';

  const decide = (approve: boolean) =>
    review.mutate({
      postId: post.postId,
      payload: {
        decision: approve ? 'VERY_UNLIKELY' : 'VERY_LIKELY',
        // Trimmed to undefined rather than sent as "": the backend interpolates this into the
        // stored violation reason, and an empty string there reads as a reason nobody gave.
        //
        // NO DEFAULT VALUE. The legacy screen pre-filled every rejection with the literal
        // "Gemini free tier out of quota", so that sentence was written into the violation record
        // of every user an admin rejected, whatever they had done. A pre-filled reason is worse
        // than an empty one: it is a false record that takes no effort to leave in place.
        feedback: feedback.trim() || undefined,
        // Only ever sent with a rejection: the backend ignores it on an approval, because an
        // approved post has no violation to type.
        violationType: approve ? undefined : (violationType as ViolationType),
      },
    });

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <p className="text-nx-body-sm font-medium text-nx-text-primary">
            {post.authorName}{' '}
            <span className="font-mono text-nx-micro font-normal text-nx-text-muted">
              #{post.authorId}
            </span>
          </p>
          <p className="font-mono text-nx-micro text-nx-text-muted">
            #{post.postId} · {relativeTime(post.createdAt)}
          </p>
        </div>
        <Badge variant={post.currentStatus === 'REJECTED' ? 'danger' : 'neutral'}>
          {t(`moderation.status.${post.currentStatus}`)}
        </Badge>
      </div>

      {/* Null on posts whose body is an event or a book rather than prose. */}
      {post.content && (
        <p className="whitespace-pre-wrap break-words text-nx-body-sm text-nx-text-secondary">
          {post.content}
        </p>
      )}

      {post.images && post.images.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {post.images.map((url) => (
            /* eslint-disable-next-line @next/next/no-img-element -- author-supplied URLs from
               object storage; `next/image` would need every host allow-listed up front. */
            <img
              key={url}
              src={url}
              alt=""
              className="aspect-square w-full rounded-nx-sm border border-nx-border-subtle object-cover"
            />
          ))}
        </div>
      )}

      <button
        type="button"
        aria-expanded={historyOpen}
        onClick={() => setHistoryOpen((open) => !open)}
        className="inline-flex w-fit items-center gap-1 text-nx-caption text-nx-text-muted hover:text-nx-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring"
      >
        <ChevronDown
          className={cn('size-3.5 transition-transform', historyOpen && 'rotate-180')}
          aria-hidden
        />
        {t('moderation.post.history', { count: post.history.length })}
      </button>

      {historyOpen &&
        (post.history.length === 0 ? (
          <p className="text-nx-caption text-nx-text-muted">{t('moderation.post.noHistory')}</p>
        ) : (
          <ol className="flex flex-col gap-2 border-l border-nx-border-subtle pl-3">
            {post.history.map((log) => (
              <li key={log.id}>
                <ModerationLogRow log={log} />
              </li>
            ))}
          </ol>
        ))}

      {canReview && (
        <div className="flex flex-col gap-2 border-t border-nx-border-subtle pt-3">
          <Textarea
            rows={2}
            label={t('moderation.post.feedback')}
            hint={t('moderation.post.feedbackHint')}
            value={feedback}
            onChange={(event) => setFeedback(event.target.value)}
          />

          {confirmingReject ? (
            <div className="flex flex-col gap-2">
              <p role="status" className="text-nx-caption text-nx-status-danger-fg">
                {t('moderation.post.rejectWarning')}
              </p>

              {/* THE LIST IS WRITTEN OUT rather than derived from `ViolationType`: a union has no
                  runtime value to map over, and the order is the Java enum's own so it never
                  silently reshuffles. Same rule `ModerationFilters` follows for statuses, and the
                  labels are the ones the log rows already use. */}
              <Select
                size="sm"
                label={t('moderation.post.violationType')}
                hint={t('moderation.post.violationTypeHint')}
                value={violationType}
                onChange={(event) => setViolationType(event.target.value as ViolationType | '')}
                options={[
                  { value: '', label: t('moderation.post.violationTypeUnset') },
                  ...VIOLATION_TYPES.map((value) => ({
                    value,
                    label: t(`moderation.violation.${value}`),
                  })),
                ]}
                wrapperClassName="w-64"
              />

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="danger"
                  loading={review.isPending}
                  // The backend refuses a rejection with no type; refusing it here instead means
                  // the moderator is told what is missing by a disabled button next to the empty
                  // field, rather than by an error after the fact.
                  disabled={!violationType}
                  onClick={() => decide(false)}
                >
                  {t('moderation.post.rejectConfirm')}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmingReject(false)}>
                  {t('moderation.post.cancel')}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                loading={review.isPending}
                onClick={() => decide(true)}
                icon={<Check className="size-4" aria-hidden />}
              >
                {t('moderation.post.approve')}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={review.isPending}
                onClick={() => setConfirmingReject(true)}
                icon={<X className="size-4" aria-hidden />}
              >
                {t('moderation.post.reject')}
              </Button>
            </div>
          )}

          {review.isError && (
            <p role="status" className="text-nx-caption text-nx-status-danger-fg">
              {getErrorMessage(review.error)}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}

export function ModerationPostsTab({ initialPostId, className }: ModerationPostsTabProps) {
  const t = useT();

  const [postId, setPostId] = useState(initialPostId ? String(initialPostId) : '');
  const [userId, setUserId] = useState('');
  // DEFAULTS TO THE QUEUE, NOT TO EVERYTHING. `''` here loaded every post the product has ever
  // held — 261 pages of mostly `APPROVED` rows under a tab labelled "Hàng chờ" — and the one thing
  // a moderator opens this for, the posts actually awaiting a decision, was buried. `PENDING_REVIEW`
  // is that set; the moderator can still widen the filter by hand. Arriving via a post-id jump
  // (from a report or a banned user) keeps it unfiltered, so that specific post shows whatever
  // status it is in.
  const [status, setStatus] = useState<ModerationStatus | ''>(
    initialPostId ? '' : 'PENDING_REVIEW'
  );
  // `bindFilter` wraps each setter so a filter change goes back to page 1 — staying on page 4 of a
  // result set a new filter shrank to one page shows an empty list that reads as "no matches".
  const { page, setPage, bindFilter } = usePagination();

  const query = useModerationPosts({
    postId: postId ? Number(postId) : undefined,
    userId: userId ? Number(userId) : undefined,
    status: status || undefined,
    page,
    size: PAGE_SIZE,
  });

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <ModerationFilters
        postId={postId}
        onPostIdChange={bindFilter(setPostId)}
        userId={userId}
        onUserIdChange={bindFilter(setUserId)}
        status={status}
        onStatusChange={bindFilter(setStatus)}
      />

      {query.isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton lines={4} />
          <Skeleton lines={4} />
        </div>
      ) : query.isError ? (
        <ApiErrorNotice error={query.error} onRetry={() => query.refetch()} />
      ) : (query.data?.content.length ?? 0) === 0 ? (
        <EmptyState
          title={t('moderation.post.empty')}
          description={t('moderation.post.emptyDesc')}
        />
      ) : (
        <>
          <div className="flex flex-col gap-4">
            {query.data?.content.map((post) => (
              <PostReviewCard key={post.postId} post={post} />
            ))}
          </div>

          <Pagination
            page={page}
            totalPages={query.data?.totalPages ?? 1}
            onPageChange={setPage}
            busy={query.isFetching}
            aria-label={t('moderation.tabs.posts')}
            label={t('moderation.pageOf', { page, totalPages: query.data?.totalPages ?? 1 })}
          />
        </>
      )}
    </div>
  );
}
