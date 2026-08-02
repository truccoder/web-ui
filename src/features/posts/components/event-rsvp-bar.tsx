'use client';

import { useState } from 'react';
import { Check, HelpCircle, X } from 'lucide-react';
import { Button } from '@/shared/components';
import { useT } from '@/core/i18n';
import { useMyProfile } from '@/features/security';
import { getErrorMessage } from '@/shared/lib/api-error';
import { cn } from '@/shared/lib/cn';
import { findMyRsvp, useAttendeeCount, useAttendees, useRsvp } from '../hooks/use-event';
import type { RsvpStatus } from '../types/event';
import { EventAttendeeList } from './event-attendee-list';

/**
 * RSVP controls for an event — fills `EventBody`'s `actions` slot.
 *
 * THREE TOGGLES, NO "UNDO". The reaction row this resembles can be switched off by pressing
 * the active button again; this one cannot, because the backend has no endpoint to withdraw
 * an RSVP. The nearest thing is NOT_GOING, which is a different statement, not an erasure —
 * it still leaves a row in the attendee list. So pressing the active button is a no-op here
 * rather than a toggle-off, and the three states a user can be in are "not answered yet",
 * "answered", and nothing else.
 *
 * WHO IS COMING CAN BE SHOWN NOW, BEHIND A TOGGLE. This block used to say the opposite, and
 * accurately: the endpoint returned the JPA entity, `userId` with no name or picture, so an
 * avatar row would have had to invent people. `EventAttendeeDto` carries `fullName` and
 * `profilePictureUrl` today, so the names go in `EventAttendeeList` — opened from here rather
 * than rendered inline, because each filter is a request and a feed of event cards that all
 * listed their attendees on mount is the N-requests problem the hook already guards against.
 *
 * The unfiltered attendee query is fetched regardless, because it is still the only way to
 * learn what *this* user answered: there is no `/rsvp/me` to match reactions' `/reactions/me`.
 *
 * THE COUNT IS REAL, unlike the post card's like/comment counts. It comes from
 * `/attendees/count`, which the backend computes on demand from the rows, not from a cached
 * feed field that nothing updates — so it is rendered rather than cut.
 */
export interface EventRsvpBarProps {
  postId: number;
  /**
   * `EventDetails.maxAttendees`, the organiser's cap. Supplied so a GOING that the server is
   * certain to refuse can be disabled before it is sent; see the note in the component.
   *
   * `null` is the normal "no cap" value, not an oversight: Jackson runs at its default
   * `ALWAYS` inclusion, so the feed payload carries the key with a null value rather than
   * omitting it. The prop accepts it so callers can pass the payload through untouched.
   */
  maxAttendees?: number | null;
  /** Fired after a successful RSVP, so the caller can refresh its own payload. */
  onChanged?: () => void;
  className?: string;
}

/**
 * Order is the Java enum's (`RsvpStatus`), so the row never silently reshuffles, and the
 * keys are spelled out rather than interpolated so they stay greppable in the translation
 * files — same two rules as `ReactionBar`.
 */
const CHOICES = [
  { status: 'GOING', Icon: Check, labelKey: 'post.event.rsvp.going' },
  { status: 'INTERESTED', Icon: HelpCircle, labelKey: 'post.event.rsvp.interested' },
  { status: 'NOT_GOING', Icon: X, labelKey: 'post.event.rsvp.notGoing' },
] as const satisfies ReadonlyArray<{
  status: RsvpStatus;
  Icon: typeof Check;
  labelKey: string;
}>;

export function EventRsvpBar({ postId, maxAttendees, onChanged, className }: EventRsvpBarProps) {
  const t = useT();

  const profile = useMyProfile();
  const attendees = useAttendees(postId);
  const count = useAttendeeCount(postId);
  const rsvp = useRsvp({ onSuccess: () => onChanged?.() });

  const [listOpen, setListOpen] = useState(false);

  // Derived, not fetched: there is no endpoint for "what did I answer".
  const mine = findMyRsvp(attendees.data, profile.data?.id);
  const current = mine?.status ?? null;

  const goingCount = count.data?.count;

  /**
   * Whether a GOING would certainly be refused.
   *
   * A LOCAL COURTESY, NOT A COPY OF THE RULE. `EventService.rsvp` is the authority and
   * rejects with 400 "Event is full"; this only avoids offering a button whose failure is
   * already knowable. It stays disabled-but-explained rather than hidden, and the error
   * branch below is still live — another person's RSVP can fill the event between this
   * render and the click, and then the server, not this check, is what says no.
   */
  // `!= null` (loose) on purpose, and this is where the first version was wrong: written as
  // `!== undefined` it treated the payload's `"maxAttendees": null` as a real cap, and since
  // `0 >= null` is true in JavaScript, EVERY uncapped event rendered as full with its GOING
  // button disabled. Measured on a real post before the fix.
  const isFull =
    maxAttendees != null &&
    goingCount !== undefined &&
    goingCount >= maxAttendees &&
    current !== 'GOING';

  const pending = rsvp.isPending;
  // Loading the viewer's own row is what decides which button is pressed, so acting before
  // it lands could send a status the user can already see is theirs.
  const loading = attendees.isLoading || profile.isLoading;

  const pick = (status: RsvpStatus) => {
    // No un-RSVP endpoint, so re-pressing the active choice has nothing to send. Doing
    // nothing is honest; sending the same status again would be a write that changes nothing
    // and still costs a refetch of both reads.
    if (status === current || pending) return;
    rsvp.mutate({ postId, status });
  };

  return (
    <div className={cn('flex flex-col gap-1 border-t border-nx-border-subtle pt-2', className)}>
      <div className="flex flex-wrap items-center gap-1">
        {CHOICES.map(({ status, Icon, labelKey }) => {
          const active = current === status;
          const disabled = loading || pending || (status === 'GOING' && isFull);

          return (
            <button
              key={status}
              type="button"
              // `aria-pressed` is what makes these toggles rather than three separate
              // actions — it carries the state the border shows, for readers who cannot
              // see the border.
              aria-pressed={active}
              disabled={disabled}
              onClick={() => pick(status)}
              className={cn(
                'inline-flex h-7 items-center gap-1.5 rounded-nx-xs border px-2',
                'text-nx-caption',
                'transition-colors duration-[var(--nx-duration-fast)] ease-nx-out',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring',
                'disabled:cursor-not-allowed disabled:opacity-50',
                active
                  ? 'border-nx-accent bg-nx-accent-soft text-nx-text-accent'
                  : 'border-transparent text-nx-text-muted hover:bg-nx-surface-hover hover:text-nx-text-primary'
              )}
            >
              <Icon aria-hidden className="size-3.5 shrink-0" />
              <span>{t(labelKey)}</span>
            </button>
          );
        })}

        {/* Real number from a real endpoint — GOING only, which is also the number the
            server compares against the cap. */}
        {goingCount !== undefined && (
          <span className="ml-1 font-mono text-nx-micro text-nx-text-muted">
            {t('post.event.rsvp.goingCount', { count: goingCount })}
          </span>
        )}

        <Button
          size="sm"
          variant="ghost"
          aria-expanded={listOpen}
          onClick={() => setListOpen((open) => !open)}
        >
          {listOpen ? t('post.event.attendees.hide') : t('post.event.attendees.show')}
        </Button>
      </div>

      {/* Mounted only when open, for the same reason `CommentThread` is: the list fetches on
          mount, and one request per event card on page load is a cost nobody asked for. */}
      {listOpen && <EventAttendeeList postId={postId} />}

      {isFull && <p className="text-nx-micro text-nx-text-muted">{t('post.event.rsvp.full')}</p>}

      {rsvp.error && (
        <p role="status" className="text-nx-micro text-nx-status-danger-fg">
          {getErrorMessage(rsvp.error)}
        </p>
      )}
    </div>
  );
}
