import { useT } from '@/lib/i18n';
import { cn } from '@/shared/lib/cn';
import type { PollDetails } from '../types/post';

/**
 * Read side of a `POLL` post — fills `PostCard`'s `body` slot.
 *
 * THE OPTIONS ARE NOT CLICKABLE, AND THAT IS NOT AN OVERSIGHT. There is no vote endpoint
 * anywhere in the backend: `PollDetails` is written by create/update and echoed back by the
 * feed and search, and no controller ever touches `PollOption.votesCount`
 * (`PostReactionController` is reactions, not votes). A tappable option would do literally
 * nothing — the same defect as a button with no handler. So the options render as inert
 * rows plus a caption saying voting is not available, which is the only honest way to show
 * a poll the app cannot answer. Turn the rows into buttons on the day an endpoint exists.
 *
 * Two fields are deliberately not rendered:
 *  - `votesCount` — always 0. The composer sends 0 because the backend does not populate it
 *    and nothing increments it afterwards. Result bars at a permanent 0% would imply a
 *    tally that is simply not being kept.
 *  - `allowMultipleVotes` — describes the rules of a vote that cannot be cast. It is real
 *    data and it goes back on screen with the voting UI, not before it.
 */
export interface PollBodyProps {
  details: PollDetails;
  className?: string;
}

export function PollBody({ details, className }: PollBodyProps) {
  const t = useT();
  const { question, options, endDate } = details;

  // Blank options are filtered at compose time, but older rows and the update path are not
  // guaranteed to be clean — and POLL is one of the kinds the backend does not validate.
  const visibleOptions = (options ?? []).filter((option) => option.text?.trim());

  const hasQuestion = Boolean(question?.trim());
  if (!hasQuestion && visibleOptions.length === 0) return null;

  const closesAt = endDate ? new Date(endDate) : null;
  const closed = closesAt !== null && !Number.isNaN(closesAt.getTime()) && closesAt < new Date();

  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-nx-sm border border-nx-border-default p-3',
        className
      )}
    >
      {hasQuestion && <p className="text-nx-ui font-semibold text-nx-text-primary">{question}</p>}

      <ul className="flex flex-col gap-1.5">
        {visibleOptions.map((option, index) => (
          // `id` is what the composer assigns (1..n) and is the stable key a future vote
          // call would use; index is only a fallback for rows written before that.
          <li
            key={option.id ?? index}
            className="rounded-nx-xs border border-nx-border-subtle bg-nx-surface-sunken px-3 py-2 text-nx-body-sm text-nx-text-primary"
          >
            {option.text}
          </li>
        ))}
      </ul>

      <p className="text-nx-micro text-nx-text-muted">
        {closed
          ? t('post.body.pollClosed', { date: closesAt!.toLocaleString() })
          : t('post.body.pollNoVoting')}
      </p>
    </div>
  );
}
