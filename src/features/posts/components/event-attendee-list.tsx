'use client';

import { useState } from 'react';
import { DeveloperIdentity, EmptyState, Select, Skeleton } from '@/shared/components';
import { useT } from '@/core/i18n';
import { getErrorMessage } from '@/shared/lib/api-error';
import { cn } from '@/shared/lib/cn';
import { useAttendees } from '../hooks/use-event';
import type { RsvpStatus } from '../types/event';

/**
 * Who answered an event, grouped by what they answered.
 *
 * THIS SCREEN COULD NOT EXIST UNTIL F-C. `GET /events/{postId}/attendees` used to return the
 * JPA entity — a `userId` and nothing else — and no endpoint turns an id into a person, so the
 * only honest thing the RSVP bar could show was a count. `EventAttendeeDto` now joins in
 * `fullName` and `profilePictureUrl`, which is the whole reason there is a list here rather
 * than a number.
 *
 * NOBODY IS CLICKABLE, and that is not an oversight. The backend exposes `/profile/me` and no
 * public profile endpoint, so a name here has nowhere to link to; a row that looked navigable
 * would 404. Same constraint the search results live under.
 *
 * FILTERING IS THE SERVER'S JOB. `?status=` is a real query parameter, so each tab is its own
 * request and its own cache entry rather than a client-side `.filter()` over one list. That
 * matters for more than tidiness: the unfiltered response is what `findMyRsvp` reads, and
 * quietly narrowing it in place would break the viewer's own badge on the RSVP bar.
 */
export interface EventAttendeeListProps {
  postId: number;
  className?: string;
}

/**
 * Order is the Java enum's (`RsvpStatus`), same rule as `EventRsvpBar`'s toggles — the row must
 * never silently reshuffle. `undefined` leads, because "everyone" is the question a reader
 * opening this list is asking first.
 */
const FILTERS = [
  { id: 'ALL', status: undefined, labelKey: 'post.event.attendees.all' },
  { id: 'GOING', status: 'GOING', labelKey: 'post.event.rsvp.going' },
  { id: 'INTERESTED', status: 'INTERESTED', labelKey: 'post.event.rsvp.interested' },
  { id: 'NOT_GOING', status: 'NOT_GOING', labelKey: 'post.event.rsvp.notGoing' },
] as const satisfies ReadonlyArray<{
  id: string;
  status: RsvpStatus | undefined;
  labelKey: string;
}>;

export function EventAttendeeList({ postId, className }: EventAttendeeListProps) {
  const t = useT();
  const [filterId, setFilterId] = useState<string>('ALL');

  const filter = FILTERS.find((f) => f.id === filterId) ?? FILTERS[0];
  const attendees = useAttendees(postId, filter.status);

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* A `Select`, NOT A TAB STRIP, and the deciding fact is where this list lives: INSIDE a
          post card, in the feed's 672 column, often below another card's own controls. A tab strip
          is a page-level device — it says "these are the sections of this surface" — and four of
          them nested in a card claim a level of structure the card does not have. `Đang quan tâm`
          and `Không tham gia` are also long enough that the four labels overflow the card on a
          phone, so the strip scrolled sideways inside something that already scrolls vertically.

          `w-44` because the field should be as wide as its longest label and no wider; left at the
          wrapper's default it would stretch the full card and read as the card's subject rather
          than as a filter on the names below it. */}
      <Select
        size="sm"
        wrapperClassName="w-44"
        aria-label={t('post.event.attendees.title')}
        value={filterId}
        onChange={(event) => setFilterId(event.target.value)}
        options={FILTERS.map((f) => ({ value: f.id, label: t(f.labelKey) }))}
      />

      {attendees.isLoading ? (
        <div className="flex flex-col gap-2">
          <Skeleton lines={2} />
          <Skeleton lines={2} />
        </div>
      ) : attendees.isError ? (
        <EmptyState
          compact
          title={t('post.event.attendees.loadFailed')}
          description={getErrorMessage(attendees.error)}
        />
      ) : (attendees.data?.length ?? 0) === 0 ? (
        <EmptyState compact title={t('post.event.attendees.empty')} />
      ) : (
        <ul className="flex flex-col gap-2">
          {attendees.data?.map((attendee) => (
            <li key={attendee.userId}>
              <DeveloperIdentity
                size="sm"
                // `fullName` is nullable in the feature type even though the join fills it,
                // because a deleted user leaves the row behind. A blank name would render as a
                // nameless avatar, which reads as a broken row rather than a departed person.
                name={attendee.fullName?.trim() || t('post.event.attendees.unknownPerson')}
                src={attendee.profilePictureUrl ?? undefined}
                // The answer belongs on the row, not just in the tab: on the "everyone" tab it
                // is the only thing distinguishing a GOING from a NOT_GOING.
                meta={t(`post.event.rsvp.${RSVP_LABEL_KEY[attendee.status]}`)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Enum value → the leaf of its translation key. Spelled out rather than lower-cased at runtime
 * so the keys stay greppable in the translation files — the same rule `EventRsvpBar` follows.
 */
const RSVP_LABEL_KEY: Record<RsvpStatus, string> = {
  GOING: 'going',
  INTERESTED: 'interested',
  NOT_GOING: 'notGoing',
};
