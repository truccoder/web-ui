'use client';

import { useState } from 'react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Pagination,
  Select,
  Skeleton,
} from '@/shared/components';
import { cn } from '@/shared/lib/cn';
import { getErrorMessage } from '@/shared/lib/api-error';
import { formatDateTime, useIntlLocale } from '@/shared/lib/format';
import { useT } from '@/core/i18n';
import type { Appeal, AppealStatus } from '../types/moderation';
import { useAppeals, useApproveAppeal, useRejectAppeal } from '../hooks/use-moderation';

/**
 * The appeal queue — the other end of the panel a user sees on `/profile`.
 *
 * IT EXISTS BECAUSE THE USER SIDE DOES. Shipping `MyViolationsPanel` without this would have made
 * the product accept appeals and give nobody the ability to decide them: every appeal would sit
 * `PENDING` for ever, which is worse than not offering the button at all — it is a promise of
 * review that no screen can keep.
 *
 * APPROVING IS NOT THE OPPOSITE OF REJECTING, and the copy has to carry that. A rejection moves a
 * status. An approval **erases the violation and re-evaluates the ban**, so it can unlock an
 * account — the mirror image of what rejecting a post can do. That is why the approve button is
 * the primary one and the note is offered on both: the note is the only record of why.
 *
 * THE STATUS FILTER IS EXPLICIT even though the server defaults to `PENDING`. A queue that only
 * ever shows one status without saying so is a queue whose filter nobody can find, and decided
 * appeals have to be reachable — an admin asked "why was this approved?" needs to answer it.
 *
 * IT IS A `Select`, AND IT WAS A TAB STRIP — the clearest case in the app of a control wearing the
 * wrong shape. This component IS a tab: it renders inside the panel that `/admin/moderation`'s
 * five-tab strip opens. So the screen drew a strip, and then drew a second strip of the same
 * shape at the same size inside the first one's panel, with no visual step between the two
 * levels. Nothing said which was the page and which was the filter.
 *
 * A LABELLED SELECT SAYS BOTH AT ONCE. It reads as a filter rather than as navigation, and it is
 * the SAME `size="sm"` labelled `Trạng thái` select at the same `w-52` that `ModerationFilters`
 * already puts on the `Hàng chờ` tab — so the two queues are now filtered by the same control
 * instead of by two different idioms one tab apart.
 */
export interface AppealsTabProps {
  className?: string;
}

const PAGE_SIZE = 10;

const STATUSES: AppealStatus[] = ['PENDING', 'APPROVED', 'REJECTED'];

export function AppealsTab({ className }: AppealsTabProps) {
  const t = useT();
  const [status, setStatus] = useState<AppealStatus>('PENDING');
  const [page, setPage] = useState(1);

  const query = useAppeals(status, page, PAGE_SIZE);

  return (
    // 12 between the filter and the queue: the admin canvas's step, the same one the page puts
    // between its tab strip and this panel.
    <div className={cn('flex flex-col gap-[var(--nx-space-element)]', className)}>
      <Select
        size="sm"
        wrapperClassName="w-52"
        label={t('moderation.filters.status')}
        value={status}
        onChange={(event) => {
          setStatus(event.target.value as AppealStatus);
          // Page 3 of PENDING is not page 3 of APPROVED — keeping the number would show an empty
          // page for a filter that has results.
          setPage(1);
        }}
        options={STATUSES.map((value) => ({
          value,
          label: t(`moderationMine.status.${value}`),
        }))}
      />

      <div className="flex flex-col gap-3">
        {query.isLoading ? (
          <Skeleton lines={5} />
        ) : query.isError ? (
          <p className="text-nx-caption text-nx-status-danger-fg">
            {getErrorMessage(query.error, t('moderation.appeals.loadError'))}
          </p>
        ) : (query.data?.content.length ?? 0) === 0 ? (
          <EmptyState compact title={t('moderation.appeals.empty')} />
        ) : (
          <>
            {query.data?.content.map((appeal) => (
              <AppealRow key={appeal.id} appeal={appeal} />
            ))}
            <Pagination
              page={page}
              totalPages={query.data?.totalPages ?? 1}
              onPageChange={setPage}
            />
          </>
        )}
      </div>
    </div>
  );
}

function AppealRow({ appeal }: { appeal: Appeal }) {
  const t = useT();
  const localeTag = useIntlLocale();
  const [note, setNote] = useState('');

  const approve = useApproveAppeal();
  const reject = useRejectAppeal();
  const busy = approve.isPending || reject.isPending;

  const decided = appeal.status !== 'PENDING';

  return (
    <Card className="flex flex-col gap-[var(--nx-space-tight)]">
      <div className="flex flex-wrap items-center gap-[var(--nx-space-pair)]">
        <Badge
          variant={
            appeal.status === 'APPROVED'
              ? 'success'
              : appeal.status === 'REJECTED'
                ? 'danger'
                : 'neutral'
          }
        >
          {t(`moderationMine.status.${appeal.status ?? 'PENDING'}`)}
        </Badge>
        {appeal.violationType && (
          <Badge mono variant="neutral">
            {appeal.violationType}
          </Badge>
        )}
        <span className="text-nx-caption text-nx-text-muted">
          {appeal.userFullName}
          {appeal.username && ` · @${appeal.username}`}
        </span>
        {appeal.createdAt && (
          <span className="text-nx-caption text-nx-text-faint">
            {formatDateTime(appeal.createdAt, localeTag)}
          </span>
        )}
      </div>

      {/* What was recorded, then what they say about it — in that order, because the decision is
          about whether the second answers the first. */}
      {appeal.violationDescription && (
        <p className="rounded-nx-sm bg-nx-surface-sunken px-3 py-2 text-nx-body-sm text-nx-text-secondary">
          {appeal.violationDescription}
        </p>
      )}
      {appeal.reason && (
        <p className="whitespace-pre-wrap text-nx-body-sm text-nx-text-primary">{appeal.reason}</p>
      )}

      {decided ? (
        appeal.reviewerNote && (
          <p className="text-nx-caption text-nx-text-muted">
            {t('moderation.appeals.note')}: {appeal.reviewerNote}
          </p>
        )
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Input
            className="min-w-0 flex-1"
            size="sm"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={t('moderation.appeals.notePlaceholder')}
            aria-label={t('moderation.appeals.note')}
          />
          {/* The note is optional all the way down — the backend accepts no body at all — so an
              empty box sends `undefined` rather than an empty string. */}
          <Button
            size="sm"
            loading={approve.isPending}
            disabled={busy}
            onClick={() =>
              appeal.id != null &&
              approve.mutate({
                appealId: appeal.id,
                payload: note.trim() ? { reviewerNote: note.trim() } : undefined,
              })
            }
          >
            {t('moderation.appeals.approve')}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            loading={reject.isPending}
            disabled={busy}
            onClick={() =>
              appeal.id != null &&
              reject.mutate({
                appealId: appeal.id,
                payload: note.trim() ? { reviewerNote: note.trim() } : undefined,
              })
            }
          >
            {t('moderation.appeals.reject')}
          </Button>
        </div>
      )}

      {(approve.isError || reject.isError) && (
        <p role="alert" className="text-nx-body-sm text-nx-status-danger-fg">
          {getErrorMessage(approve.error ?? reject.error, t('moderation.appeals.decisionError'))}
        </p>
      )}
    </Card>
  );
}
