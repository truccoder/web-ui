'use client';

import { Badge, Card, EmptyState, Skeleton } from '@/shared/components';
import { getErrorMessage } from '@/shared/lib/api-error';
import { useT } from '@/core/i18n';
import type { RoadmapProgress, VerificationStatus, VerificationTier } from '../types/roadmap';
import { useRoadmapProgress } from '../hooks';

/**
 * The nodes one user has claimed — the "my verified skills" card `/profile` has been missing.
 *
 * IT EXISTS NOW BECAUSE B21 CLOSED. The ledger recorded the gap precisely: the repository method
 * `UserRoadmapProgressRepository.findByUserId()` had been there all along with no controller in
 * front of it, so a skills card would have had to invent the one thing it exists to show.
 * `GET /users/{userId}/roadmap-progress` shipped in the 2026-08-09 backend batch.
 *
 * IT RENDERS THREE STATUSES, NOT ONE, and that is the subtlety worth knowing before editing this.
 * The endpoint filters to `VERIFIED` for every viewer EXCEPT the user themselves, who also gets
 * `PENDING_APPROVAL` and `REJECTED`. So the same component on your own profile shows claims in
 * flight, and on a stranger's would show only what is settled. Rendering only `VERIFIED` would
 * silently drop the rows the owner most wants to see; assuming everything received is verified
 * would label a rejected claim as a skill.
 *
 * REJECTED ROWS ARE SHOWN RATHER THAN HIDDEN. They are the only feedback the requester ever gets:
 * `rejectVerification` has no reason field, so the status is the entire message. Hiding them would
 * leave a claim that simply vanished, which reads as a bug rather than as a decision.
 *
 * SORTED HERE, BECAUSE THE BACKEND DOES NOT. `UserRoadmapProgressRepository` declares no
 * `OrderBy` — the same trap already recorded on `RoadmapNode.orderIndex` — so a list rendered as
 * received looks stable in dev and reshuffles in production. Verified first (the point of the
 * card), then pending, then rejected; ties broken by name so the order is total and stable.
 *
 * NO PROOF LINKS AND NO VERIFIER NAME, because the DTO carries neither: the endpoint is open to
 * signed-out visitors and the backend deliberately keeps those fields out of it. Nothing to
 * render, and nothing to ask the backend for either — that is a privacy decision, not a gap.
 */
export interface MySkillsCardProps {
  /**
   * Whose skills. `undefined` while the profile query is in flight, which keeps the request idle
   * rather than firing it for an id nobody has yet.
   */
  userId?: number;
  /**
   * Somebody else's skills — changes the EMPTY state only.
   *
   * The owner's copy is an instruction ("record a skill from the roadmap and it will show here"),
   * which is an action the viewer of another person's profile cannot take and was never being
   * offered. The rows themselves need no variant: the backend already decides what a viewer may
   * see, and a stranger gets `VERIFIED` only.
   *
   * @default false
   */
  readOnly?: boolean;
}

const TIER_LABEL_KEY: Record<VerificationTier, string> = {
  SELF_VERIFIED: 'self',
  MOD_VERIFIED: 'mod',
  QUIZ_VERIFIED: 'quiz',
  AUTO_CERTIFIED: 'auto',
};

/**
 * Status → badge. `VERIFIED` is the only success; `PENDING_APPROVAL` is warning rather than info
 * because it is waiting on someone else and the owner may want to chase it.
 */
// `VERIFIED` is `rep`, NOT `success`. A verified skill is the canonical amber fact in this
// product — the ledger has always drawn it that way — and dressing it in the success green
// made one page state the same thing in two colours. The other two stay severity colours,
// because pending and rejected are states of a request, not reputation.
const STATUS_VARIANT: Record<VerificationStatus, 'rep' | 'warning' | 'danger'> = {
  VERIFIED: 'rep',
  PENDING_APPROVAL: 'warning',
  REJECTED: 'danger',
};

const STATUS_LABEL_KEY: Record<VerificationStatus, string> = {
  VERIFIED: 'verified',
  PENDING_APPROVAL: 'pending',
  REJECTED: 'rejected',
};

/** Verified first, then in-flight, then settled-negative. */
const STATUS_ORDER: Record<VerificationStatus, number> = {
  VERIFIED: 0,
  PENDING_APPROVAL: 1,
  REJECTED: 2,
};

function sortRows(rows: readonly RoadmapProgress[]): RoadmapProgress[] {
  return [...rows].sort(
    (a, b) =>
      STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.nodeName.localeCompare(b.nodeName)
  );
}

export function MySkillsCard({ userId, readOnly = false }: MySkillsCardProps) {
  const t = useT();
  const {
    data: rows,
    isPending,
    isError,
    error,
  } = useRoadmapProgress(userId ?? Number.NaN, userId != null);

  // Idle-waiting-for-id and genuinely-loading both read as loading, which is what they are from
  // the page's point of view.
  if (userId == null || isPending) {
    return (
      <Card>
        <Skeleton lines={3} />
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <p className="text-nx-caption text-nx-status-danger-fg">
          {getErrorMessage(error, t('profile.skills.loadError'))}
        </p>
      </Card>
    );
  }

  if (rows.length === 0) {
    return (
      <Card>
        <EmptyState
          compact
          title={t('profile.skills.emptyTitle')}
          description={
            readOnly ? t('profile.skills.emptyDescOther') : t('profile.skills.emptyDesc')
          }
        />
      </Card>
    );
  }

  return (
    <Card>
      {/* A GRID OF RECESSED TILES, NOT A COLUMN OF ROWS. A handful of skills in one flex row each
          read as a table with no header, name on the left and two badges pinned to the far right
          edge of a wide card. Grouped two or three across, the badges sit right under the name
          they describe instead of stretched away from it. */}
      <ul className="grid gap-[var(--nx-space-element)] sm:grid-cols-2 lg:grid-cols-3">
        {sortRows(rows).map((row) => (
          <li key={row.nodeId}>
            <Card variant="inset" padding="12px 14px" className="flex h-full flex-col gap-2">
              <span className="text-nx-body-sm font-medium text-nx-text-primary">
                {row.nodeName}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {/* The tier says HOW it was backed up, which is what makes one verified skill
                    different from another — a GitHub-certified node is a stronger claim than a
                    self-declared one, and collapsing them to a single tick throws that away. */}
                <Badge variant="neutral">
                  {t(`roadmap.verify.tier.${TIER_LABEL_KEY[row.tier]}`)}
                </Badge>
                <Badge variant={STATUS_VARIANT[row.status]}>
                  {t(`profile.skills.status.${STATUS_LABEL_KEY[row.status]}`)}
                </Badge>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </Card>
  );
}
