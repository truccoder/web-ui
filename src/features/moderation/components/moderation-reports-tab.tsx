'use client';

import { useState } from 'react';
import { Flag } from 'lucide-react';
import { Badge, Button, Card, EmptyState, Input, Pagination, Skeleton } from '@/shared/components';
import { useT } from '@/core/i18n';
import { getErrorMessage } from '@/shared/lib/api-error';
import { useRelativeTime } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';
import { useReports } from '../hooks/use-moderation';

/**
 * What readers have flagged — the half of moderation that had a write path and no read path.
 *
 * `ReportPostDialog` has been posting to `POST /moderation/reports` since B11, and
 * `GET /admin/moderation/reports` was the **only endpoint in the whole generated spec with no
 * caller anywhere in the app**. So every report a reader filed went into the database and out of
 * anyone's reach. This tab is the other end of that path.
 *
 * A REPORT IS A POINTER, NOT A CASE FILE, and the row is shaped around that. `PostReportDto`
 * carries `postId`, `reporterId`, `reason`, `details` and `createdAt` — no post content, no author
 * name, no reporter name, and nothing to join them against on this screen. So the row states what
 * it was actually given and hands off: `#postId` is a button into the review queue, which is the
 * surface that HAS the post, its author and its history, and which already accepts a post id to
 * open on (`onViewPost`, the same mechanism the banned-users tab uses).
 *
 * NO SEVERITY COLOUR ON THE REASON. It is tempting to paint `HATE_SPEECH` red and `SPAM` amber,
 * and it would be invented: the backend ranks these nowhere. `PostReportEntity` stores the enum
 * and the moderation threshold counts reports without weighting them, so a colour scale here
 * would be this screen's opinion rendered as if it were the system's. Every reason gets the same
 * neutral chip and the words do the work.
 *
 * NOTHING TO DECIDE, AND THE SCREEN SAYS SO ONCE RATHER THAN IMPLYING IT EVERYWHERE. There is no
 * `PATCH`, no status on the row, no "handled" flag anywhere in the API — a post decided in the
 * queue keeps its reports here, unchanged, for ever. Rendering an approve/dismiss control would
 * be a promise no endpoint can keep, so the tab is read-only and the note under the filter
 * explains why rather than leaving a moderator hunting for the button.
 *
 * THE ONE FILTER IS THE ONE THE SERVER HAS. `?postId=` is the whole query surface — no reason
 * filter, no date range, no reporter. `ModerationFilters` is not reused for that reason: two of
 * its three controls would be dead here, and a filter that does not filter is worse than a filter
 * that is missing.
 */
export interface ModerationReportsTabProps {
  /** Open a reported post in the review queue. Omit to render ids as plain text. */
  onViewPost?: (postId: number) => void;
  className?: string;
}

const PAGE_SIZE = 10;

export function ModerationReportsTab({ onViewPost, className }: ModerationReportsTabProps) {
  const t = useT();
  const relativeTime = useRelativeTime();

  // A string, like `ModerationFilters` keeps it: an id is an identifier, not a quantity, and an
  // empty field has to mean "no filter" rather than `NaN`.
  const [postIdInput, setPostIdInput] = useState('');
  const [page, setPage] = useState(1);

  const parsed = Number.parseInt(postIdInput, 10);
  const postId = Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;

  const query = useReports(postId, page, PAGE_SIZE);

  const filter = (
    <div className="flex flex-col gap-2">
      <Input
        mono
        size="sm"
        inputMode="numeric"
        label={t('moderation.filters.postId')}
        value={postIdInput}
        onChange={(event) => {
          setPostIdInput(event.target.value);
          // A narrowed list is a different list; staying on page 4 of the old one would show an
          // empty page for a filter that has results.
          setPage(1);
        }}
        wrapperClassName="w-32"
      />
      <p className="text-nx-caption text-nx-text-muted">{t('moderation.reports.readOnly')}</p>
    </div>
  );

  if (query.isLoading) {
    return (
      <div className={cn('flex flex-col gap-4', className)}>
        {filter}
        <Skeleton lines={5} />
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className={cn('flex flex-col gap-4', className)}>
        {filter}
        <EmptyState title={t('moderation.loadFailed')} description={getErrorMessage(query.error)} />
      </div>
    );
  }

  const reports = query.data?.content ?? [];

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {filter}

      {reports.length === 0 ? (
        <EmptyState
          icon={<Flag />}
          // Two different facts, and conflating them would mislead: an unfiltered empty list means
          // nobody has reported anything, while a filtered one means nobody reported THIS post.
          title={
            postId
              ? t('moderation.reports.emptyForPost', { postId })
              : t('moderation.reports.empty')
          }
        />
      ) : (
        <>
          <p className="text-nx-caption text-nx-text-muted">
            {t('moderation.reports.total', { count: query.data?.totalElements ?? 0 })}
          </p>

          <ul className="flex flex-col gap-3">
            {reports.map((report) => (
              <li key={report.id}>
                <Card className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* The reporter-facing labels, reused rather than restated: same enum, same
                          meaning, and one list to keep current instead of two. */}
                      <Badge variant="neutral">
                        {t(`moderation.report.reason.${report.reason}`)}
                      </Badge>

                      {report.postId != null &&
                        (onViewPost ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onViewPost(report.postId!)}
                          >
                            {t('moderation.reports.viewPost', { postId: report.postId })}
                          </Button>
                        ) : (
                          <span className="font-mono text-nx-caption text-nx-text-muted">
                            #{report.postId}
                          </span>
                        ))}
                    </div>

                    {report.createdAt && (
                      <span className="text-nx-caption text-nx-text-muted">
                        {relativeTime(report.createdAt)}
                      </span>
                    )}
                  </div>

                  {/* Free text the reporter typed. Rendered as plain text in a `<p>` — React
                      escapes it — and only when there is some: an empty details line would put a
                      blank row under every report that used the reason on its own. */}
                  {report.details && (
                    <p className="text-nx-body-sm whitespace-pre-wrap text-nx-text-secondary">
                      {report.details}
                    </p>
                  )}

                  {/* An id, not a name — the DTO has no name to give. Shown anyway because two
                      reports from the same account read differently from two reports from two. */}
                  {report.reporterId != null && (
                    <p className="font-mono text-nx-micro text-nx-text-muted">
                      {t('moderation.reports.reporter', { reporterId: report.reporterId })}
                    </p>
                  )}
                </Card>
              </li>
            ))}
          </ul>

          <Pagination
            page={page}
            totalPages={query.data?.totalPages ?? 1}
            onPageChange={setPage}
            busy={query.isFetching}
            aria-label={t('moderation.tabs.reports')}
            label={t('moderation.pageOf', { page, totalPages: query.data?.totalPages ?? 1 })}
          />
        </>
      )}
    </div>
  );
}
