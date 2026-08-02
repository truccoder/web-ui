'use client';

import { useState } from 'react';
import { DeveloperIdentity, EmptyState, Skeleton, Tabs } from '@/shared/components';
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
      <Tabs
        size="sm"
        active={filterId}
        onChange={setFilterId}
        aria-label={t('post.event.attendees.title')}
        tabs={FILTERS.map((f) => ({ id: f.id, label: t(f.labelKey) }))}
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
