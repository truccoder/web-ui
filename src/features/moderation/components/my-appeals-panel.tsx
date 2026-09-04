'use client';

import { ExternalLink } from 'lucide-react';
import { ApiErrorNotice, Badge, ButtonLink, Card, EmptyState, Skeleton } from '@/shared/components';
import { formatDate, useIntlLocale } from '@/shared/lib/format';
import { useT } from '@/core/i18n';
import type { Appeal } from '../types/moderation';
import { useMyAppeals } from '../hooks/use-moderation';

/**
 * The signed-in account's own appeals, with the reviewer's decision once there is one — the
 * `Kháng cáo` tab of `/moderation`.
 *
 * SPLIT OUT OF `MyViolationsPanel` when `/moderation` became a two-tab route. It was the "decided
 * appeals" section stacked under the violations there; a violation and the outcome of contesting
 * it are two states, so they get a tab each.
 */
const STATUS_VARIANT = {
  PENDING: 'neutral',
  APPROVED: 'success',
  REJECTED: 'danger',
} as const;

function AppealRow({ appeal, localeTag }: { appeal: Appeal; localeTag: string }) {
  const t = useT();

  return (
    <div className="flex flex-col gap-[var(--nx-space-tight)] rounded-nx-md bg-nx-surface-card px-5 py-3">
      <div className="flex flex-wrap items-center gap-[var(--nx-space-pair)]">
        {appeal.status && (
          <Badge variant={STATUS_VARIANT[appeal.status]}>
            {t(`moderationMine.status.${appeal.status}`)}
          </Badge>
        )}
        {appeal.violationType && (
          <Badge variant="danger">{t(`moderation.violation.${appeal.violationType}`)}</Badge>
        )}
        {appeal.createdAt && (
          <span className="text-nx-caption text-nx-text-muted">
            {formatDate(appeal.createdAt, localeTag)}
          </span>
        )}
      </div>

      {/* WHICH VIOLATION THIS APPEAL IS ABOUT. `AppealDto` carries `violationType` and
          `violationDescription` (B22-era fields the row simply never read) plus, since B50,
          `postId`/`postExcerpt` — the same pair `UserViolationDto` got from B47, and for the same
          reason: someone deciding whether a "Đã từ chối" appeal was fair needs to reread what was
          actually flagged, not just their own argument for why it wasn't a violation. */}
      {appeal.postExcerpt && (
        <p className="line-clamp-3 border-l-2 border-nx-border-default pl-3 text-nx-body-sm text-nx-text-secondary">
          {appeal.postExcerpt}
        </p>
      )}

      {appeal.violationDescription && (
        <p className="text-nx-body-sm text-nx-text-secondary">
          <span className="font-medium text-nx-text-primary">
            {t('moderationMine.violationReason')}
          </span>{' '}
          {appeal.violationDescription}
        </p>
      )}

      {appeal.reason && <p className="text-nx-body-sm text-nx-text-secondary">{appeal.reason}</p>}

      {/* The reviewer's note is the only thing on this screen written by a person rather than by
          the classifier, so it is set apart rather than run together with your own words. */}
      {appeal.reviewerNote && (
        <p className="rounded-nx-sm bg-nx-surface-sunken px-3 py-2 text-nx-body-sm text-nx-text-primary">
          {appeal.reviewerNote}
        </p>
      )}

      {appeal.postId != null ? (
        <ButtonLink
          href={`/posts/${appeal.postId}`}
          size="sm"
          variant="ghost"
          icon={<ExternalLink className="size-4" aria-hidden />}
          className="w-fit"
        >
          {t('moderationMine.viewPost')}
        </ButtonLink>
      ) : (
        appeal.postExcerpt && (
          <span className="text-nx-caption text-nx-text-muted">
            {t('moderationMine.postDeleted')}
          </span>
        )
      )}
    </div>
  );
}

export function MyAppealsPanel() {
  const t = useT();
  const localeTag = useIntlLocale();
  const appeals = useMyAppeals();

  if (appeals.isPending) {
    return (
      <Card>
        <Skeleton lines={2} />
      </Card>
    );
  }

  if (appeals.isError) {
    return <ApiErrorNotice error={appeals.error} onRetry={() => appeals.refetch()} />;
  }

  const rows = appeals.data ?? [];

  if (rows.length === 0) {
    return (
      <EmptyState
        title={t('moderationMine.appealsEmptyTitle')}
        description={t('moderationMine.appealsEmptyDesc')}
      />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {rows.map((appeal) => (
        <AppealRow key={appeal.id} appeal={appeal} localeTag={localeTag} />
      ))}
    </div>
  );
}
