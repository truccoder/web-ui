'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Dialog,
  EmptyState,
  Skeleton,
  Textarea,
} from '@/shared/components';
import { getErrorMessage } from '@/shared/lib/api-error';
import { formatDate, useIntlLocale } from '@/shared/lib/format';
import { useT } from '@/core/i18n';
import type { ProjectApplication, ProjectPosition } from '../types/matchmaking';
import {
  useAcceptApplication,
  useApplyToPosition,
  useProject,
  useProjectApplications,
  useRejectApplication,
  useSuggestedCandidates,
} from '../hooks/use-matchmaking';
import { ProjectOwnerControls } from './project-owner-controls';
import { AddPositionButton, PositionOwnerControls } from './position-owner-controls';
import { ProjectMembersSection } from './project-members-section';

/**
 * One project: what it is, which roles are open, and — if you own it — who has asked to join.
 *
 * TWO AUDIENCES, ONE SCREEN, SPLIT BY `authorId`. A visitor sees the roles and an `Ứng tuyển`
 * button; the owner sees the same roles plus the application inbox. The split is computed from the
 * project's own `authorId` rather than discovered by calling the inbox: that endpoint answers
 * **403** to everyone else, so probing it would put a guaranteed error in every visitor's console
 * and would be using an authorization failure as a feature detector.
 *
 * THE OWNER DOES NOT GET AN APPLY BUTTON. Nothing server-side forbids applying to your own
 * project, which is exactly why the control is withheld here — the honest reason is that it makes
 * no sense, not that it fails.
 */
export interface ProjectDetailProps {
  projectId: number;
  /** The signed-in account, for the owner split. Undefined while the profile is in flight. */
  viewerId?: number;
  /**
   * Called after the owner deletes the project. The page passes a router push — `features/*` does
   * not import `next/navigation`, so navigation stays at the route layer.
   */
  onDeleted?: () => void;
}

export function ProjectDetail({ projectId, viewerId, onDeleted }: ProjectDetailProps) {
  const t = useT();
  const localeTag = useIntlLocale();
  const { data: project, isPending, isError, error } = useProject(projectId);

  const isOwner = viewerId != null && project?.authorId === viewerId;
  const applications = useProjectApplications(projectId, isOwner);

  if (isPending) {
    return (
      <Card>
        <Skeleton lines={4} />
      </Card>
    );
  }

  if (isError || !project) {
    return (
      <EmptyState
        title={t('projects.detail.notFoundTitle')}
        description={getErrorMessage(error, t('projects.detail.notFoundDesc'))}
      />
    );
  }

  const positions = project.positions ?? [];

  // `authorUsername` — B35 in `docs/backend-plan.md`, closed the same way B13 closed it for the
  // feed: absent still means plain text, for a payload that predates the field.
  const authorHref = project.authorUsername
    ? `/u/${encodeURIComponent(project.authorUsername)}`
    : undefined;

  return (
    <div className="flex flex-col gap-[var(--nx-space-section)]">
      <Card className="flex flex-col gap-[var(--nx-space-group)]">
        <div className="flex items-start gap-3">
          {authorHref ? (
            <Link href={authorHref} className="shrink-0 rounded-nx-full">
              <Avatar
                src={project.authorProfilePictureUrl}
                name={project.authorFullName}
                size="lg"
              />
            </Link>
          ) : (
            <Avatar src={project.authorProfilePictureUrl} name={project.authorFullName} size="lg" />
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-nx-title font-semibold tracking-tight text-nx-text-primary">
              {project.title}
            </h1>
            <p className="text-nx-caption text-nx-text-muted">
              {authorHref ? (
                <Link href={authorHref} className="hover:text-nx-text-primary hover:underline">
                  {project.authorFullName}
                </Link>
              ) : (
                project.authorFullName
              )}
              {project.createdAt && ` · ${formatDate(project.createdAt, localeTag)}`}
            </p>
          </div>
          {project.status && project.status !== 'OPEN' && (
            <Badge variant={project.status === 'COMPLETED' ? 'success' : 'neutral'}>
              {t(`projects.status.${project.status}`)}
            </Badge>
          )}
        </div>

        {project.description && (
          <p className="whitespace-pre-wrap text-nx-body text-nx-text-primary">
            {project.description}
          </p>
        )}

        {isOwner && <ProjectOwnerControls project={project} onDeleted={() => onDeleted?.()} />}
      </Card>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-nx-title-sm text-nx-text-primary">
            {t('projects.detail.positions')}
          </h2>
          {isOwner && project.status !== 'COMPLETED' && project.id != null && (
            <AddPositionButton projectId={project.id} />
          )}
        </div>

        {positions.length === 0 ? (
          // A project with no roles is a real state the API allows: `positions` is optional on the
          // create request. It is not an error and does not read as one.
          <EmptyState compact title={t('projects.detail.noPositions')} />
        ) : (
          <ul className="flex flex-col gap-[var(--nx-space-block)]">
            {positions.map((position) => (
              <li key={position.id}>
                <PositionCard
                  position={position}
                  isOwner={isOwner}
                  canApply={!isOwner && project.status === 'OPEN'}
                  ownerControls={
                    isOwner ? <PositionOwnerControls position={position} /> : undefined
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <ProjectMembersSection projectId={projectId} isOwner={isOwner} />

      {isOwner && (
        <section className="flex flex-col gap-3">
          <h2 className="text-nx-title-sm text-nx-text-primary">
            {t('projects.detail.applications')}
          </h2>
          <OwnerInbox
            applications={applications.data}
            isPending={applications.isPending}
            isError={applications.isError}
            error={applications.error}
          />
        </section>
      )}
    </div>
  );
}

function PositionCard({
  position,
  isOwner,
  canApply,
  ownerControls,
}: {
  position: ProjectPosition;
  /** Whether the viewer owns this project — the candidate ranking is theirs alone to see. */
  isOwner: boolean;
  canApply: boolean;
  /** The owner's edit / status / delete row, rendered inside the card below the role details. */
  ownerControls?: ReactNode;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const apply = useApplyToPosition();

  const isOpen = position.status === 'OPEN';

  return (
    <Card className="flex flex-col gap-[var(--nx-space-tight)]">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-nx-ui font-medium text-nx-text-primary">{position.title}</p>
          {position.description && (
            <p className="mt-0.5 whitespace-pre-wrap text-nx-body-sm text-nx-text-secondary">
              {position.description}
            </p>
          )}
        </div>

        {/* The button is only offered on an open role. A filled one says so instead — the API
            refuses the call with "Position is not open for applications", and a button that
            exists to produce that error is a trap. */}
        {canApply && isOpen ? (
          <Button
            size="sm"
            onClick={() => {
              apply.reset();
              setMessage('');
              setOpen(true);
            }}
          >
            {t('projects.apply')}
          </Button>
        ) : (
          <Badge variant="neutral">
            {t(`projects.positionStatus.${position.status ?? 'OPEN'}`)}
          </Badge>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-[var(--nx-space-pair)]">
        {position.quantity != null && position.quantity > 1 && (
          <span className="text-nx-caption text-nx-text-muted">
            {t('projects.quantity', { count: position.quantity })}
          </span>
        )}
        {position.requiredSkills?.map((skill) => (
          <Badge key={skill} variant="accent">
            {skill}
          </Badge>
        ))}
      </div>

      {/* OWNER ONLY, AND THE GATE IS NOT COSMETIC. `GET /positions/{id}/suggested-candidates` is
          owner-scoped and answers **403** to everyone else, so rendering this for a visitor sent
          one guaranteed-refused request per open position — three per page on a typical project —
          which the component then swallowed as "an empty result". Asking a question whose answer is
          already known is the same rule `core/api/axios`'s guest allow-list follows, and the cost
          of breaking it here was a page that could not be told apart from a broken one while
          reading the network tab. Measured 02/09 on `/projects/4050`: 3 × 403. */}
      {isOpen && isOwner && <MatchingCandidates position={position} />}

      {ownerControls}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        width={560}
        title={t('projects.applyTitle', { title: position.title ?? '' })}
        description={t('projects.applyDesc')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t('projects.cancel')}
            </Button>
            <Button
              loading={apply.isPending}
              // The server accepts an empty message — `ApplicationRequestDTO.message` carries no
              // validation at all — so this gate is the product's, not the API's. An application
              // with nothing in it gives the owner nothing to decide on.
              disabled={message.trim().length === 0}
              onClick={() => {
                if (position.id == null) return;
                apply.mutate(
                  { positionId: position.id, payload: { message: message.trim() } },
                  { onSuccess: () => setOpen(false) }
                );
              }}
            >
              {t('projects.submitApplication')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Textarea
            rows={5}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={t('projects.messagePlaceholder')}
            aria-label={t('projects.messageLabel')}
          />
          {apply.isError && (
            <p role="alert" className="text-nx-body-sm text-nx-status-danger-fg">
              {getErrorMessage(apply.error, t('projects.applyError'))}
            </p>
          )}
        </div>
      </Dialog>
    </Card>
  );
}

/**
 * The owner's inbox.
 *
 * ACCEPT CAN FAIL WITHOUT ANYONE DOING ANYTHING WRONG. The position row is locked per transaction,
 * so a concurrent accept that fills the last slot makes this one refuse — the error is shown
 * rather than swallowed, and the list refetches either way because the same action can flip the
 * position to `FILLED`.
 */
/**
 * WHO ALREADY HAS THE SKILLS THIS POSITION ASKS FOR, BEST MATCH FIRST.
 *
 * This is the product's matchmaking claim made visible — "query by verified skill instead of
 * reading CVs" — and the endpoint behind it had a complete data layer and no screen at all:
 * `useSuggestedCandidates` was written, exported from the barrel, and called by nothing.
 *
 * THERE ARE NO NAMES HERE, AND THAT IS THE BACKEND'S SHAPE, NOT AN OMISSION.
 * `SuggestedCandidateDto` carries `userId · jobTitle · primaryRole · seniorityLevel ·
 * yearsOfExperience · knownTechStack` and nothing else — no name, no handle, no picture — and
 * nothing in this app turns a user id into a profile. So a candidate is drawn as the thing the
 * server actually answers: a professional shape. That is arguably the more honest object for a
 * skills query anyway; it is a match on capability, not a shortlist of people.
 *
 * IT IS A RANKING NOW (B26, `ecc53bb`), AND THE WORDING CHANGED WITH IT. The backend used to
 * match on "shares at least one required skill" with no score and no order, which is why this
 * used to say `phù hợp` and never numbered the rows. `ProfileMatchScorer` computes a real
 * `matchScore` per candidate and the backend sorts by it, so presenting position — a rank, a
 * score — is no longer inventing a claim the data cannot support; it is reading one off the wire.
 *
 * `matchedSkills` DRIVES THE ACCENT HIGHLIGHT, NOT A CLIENT-SIDE SET COMPUTED AGAINST
 * `position.requiredSkills`. The backend already computed the intersection to produce
 * `matchScore` — recomputing it here risked the two disagreeing the moment either side's
 * normalisation (case, whitespace) drifted.
 */
function MatchingCandidates({ position }: { position: ProjectPosition }) {
  const t = useT();
  const { data, isPending, isError } = useSuggestedCandidates(position.id ?? undefined, 10);

  // Errors are a normal outcome for this endpoint rather than a bug (it 500'd on every call
  // until B24), and an empty result is the common case: a position with no required skills
  // matches nobody. Neither deserves a slab of error text inside a position card.
  if (isPending || isError || !data || data.length === 0) return null;

  return (
    <div className="mt-[var(--nx-space-element)] border-t border-nx-border-subtle pt-[var(--nx-space-element)]">
      <p className="text-nx-overline uppercase tracking-[0.08em] text-nx-text-muted">
        {t('projects.matching.title', { count: data.length })}
      </p>

      <ul className="mt-[var(--nx-space-tight)] flex flex-col gap-[var(--nx-space-tight)]">
        {data.slice(0, 4).map((candidate) => {
          const matched = new Set(candidate.matchedSkills.map((skill) => skill.toLowerCase()));
          return (
            <li
              key={candidate.userId}
              className="flex flex-wrap items-baseline gap-x-[var(--nx-space-tight)] gap-y-[var(--nx-space-pair)]"
            >
              <span className="text-nx-body-sm text-nx-text-primary">
                {candidate.jobTitle?.trim() ||
                  (candidate.primaryRole
                    ? t(`knowledge.primaryRole.${candidate.primaryRole}`)
                    : t('projects.matching.unnamedRole'))}
              </span>

              {candidate.seniorityLevel && (
                <span className="text-nx-caption text-nx-text-secondary">
                  {t(`knowledge.seniority.${candidate.seniorityLevel}`)}
                </span>
              )}

              {/* An em dash rather than a 0 when the number is absent — better no number than a
                  wrong one. */}
              {candidate.yearsOfExperience != null && (
                <span className="font-mono text-nx-caption tabular-nums text-nx-text-muted">
                  {t('projects.matching.years', { count: candidate.yearsOfExperience })}
                </span>
              )}

              <span className="font-mono text-nx-caption tabular-nums text-nx-text-faint">
                {t('projects.matching.score', { score: candidate.matchScore })}
              </span>

              {/* The skills this person shares with the position are the reason they are on the
                  list, so they are the ones drawn in the accent; the rest stay neutral. */}
              <span className="flex flex-wrap items-center gap-[var(--nx-space-pair)]">
                {(candidate.knownTechStack ?? []).slice(0, 5).map((skill) => (
                  <Badge
                    key={skill}
                    variant={matched.has(skill.toLowerCase()) ? 'accent' : 'neutral'}
                  >
                    {skill}
                  </Badge>
                ))}
              </span>
            </li>
          );
        })}
      </ul>

      {data.length > 4 && (
        <p className="mt-[var(--nx-space-tight)] text-nx-caption text-nx-text-faint">
          {t('projects.matching.more', { count: data.length - 4 })}
        </p>
      )}
    </div>
  );
}

function OwnerInbox({
  applications,
  isPending,
  isError,
  error,
}: {
  applications?: ProjectApplication[];
  isPending: boolean;
  isError: boolean;
  error: unknown;
}) {
  const t = useT();
  const localeTag = useIntlLocale();
  const accept = useAcceptApplication();
  const reject = useRejectApplication();

  if (isPending) return <Skeleton lines={2} />;

  if (isError) {
    return (
      <p className="text-nx-caption text-nx-status-danger-fg">
        {getErrorMessage(error, t('projects.detail.applicationsError'))}
      </p>
    );
  }

  const rows = applications ?? [];
  if (rows.length === 0) {
    return <EmptyState compact title={t('projects.detail.noApplications')} />;
  }

  const busy = accept.isPending || reject.isPending;

  return (
    <div className="flex flex-col gap-4">
      {(accept.isError || reject.isError) && (
        <p role="alert" className="text-nx-body-sm text-nx-status-danger-fg">
          {getErrorMessage(accept.error ?? reject.error, t('projects.decisionError'))}
        </p>
      )}

      {rows.map((application) => {
        // `applicantUsername` — same B35, and it was always the applicant half of that gap
        // rather than a separate one: `ProjectApplicationResponseDto` got the field alongside
        // `ProjectResponseDto.authorUsername`.
        const applicantHref = application.applicantUsername
          ? `/u/${encodeURIComponent(application.applicantUsername)}`
          : undefined;

        return (
          <div
            key={application.id}
            className="flex flex-col gap-[var(--nx-space-tight)] rounded-nx-md bg-nx-surface-card px-5 py-3"
          >
            <div className="flex items-center gap-3">
              {applicantHref ? (
                <Link href={applicantHref} className="shrink-0 rounded-nx-full">
                  <Avatar
                    src={application.applicantProfilePictureUrl}
                    name={application.applicantFullName}
                    size="md"
                  />
                </Link>
              ) : (
                <Avatar
                  src={application.applicantProfilePictureUrl}
                  name={application.applicantFullName}
                  size="md"
                />
              )}
              <div className="min-w-0 flex-1">
                {applicantHref ? (
                  <Link
                    href={applicantHref}
                    className="block truncate text-nx-ui font-medium text-nx-text-primary hover:underline"
                  >
                    {application.applicantFullName}
                  </Link>
                ) : (
                  <p className="truncate text-nx-ui font-medium text-nx-text-primary">
                    {application.applicantFullName}
                  </p>
                )}
                <p className="truncate text-nx-caption text-nx-text-muted">
                  {application.positionTitle}
                  {application.createdAt && ` · ${formatDate(application.createdAt, localeTag)}`}
                </p>
              </div>

              {application.status === 'PENDING' ? (
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() => application.id != null && accept.mutate(application.id)}
                  >
                    {t('projects.accept')}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busy}
                    onClick={() => application.id != null && reject.mutate(application.id)}
                  >
                    {t('projects.reject')}
                  </Button>
                </div>
              ) : (
                <Badge variant={application.status === 'ACCEPTED' ? 'success' : 'neutral'}>
                  {t(`projects.applicationStatus.${application.status ?? 'PENDING'}`)}
                </Badge>
              )}
            </div>

            {application.message && (
              <p className="whitespace-pre-wrap text-nx-body-sm text-nx-text-secondary">
                {application.message}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
