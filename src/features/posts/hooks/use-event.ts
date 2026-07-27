'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { eventsApi } from '../api/event';
import type { EventRsvp, RsvpStatus } from '../types/event';
import { postKeys } from './keys';
import type { PostMutationOptions } from './use-post';

/**
 * Event state layer (EventController), cycle 3.
 *
 * THE VIEWER'S OWN RSVP IS DERIVED, NOT FETCHED. Reactions have `/reactions/me`; events have
 * nothing equivalent, so "what did I answer" can only come from finding your own `userId` in
 * the attendee list. `findMyRsvp` below does that, and it is the reason the attendee query
 * matters even to a card that only wants to render one button.
 *
 * WRITES INVALIDATE, THEY DO NOT PATCH. `rsvp` returns void, and the two reads it affects
 * disagree in a way that makes local patching wrong rather than merely lazy: switching GOING
 * → INTERESTED leaves the attendee list the same length while the count drops, because the
 * count is GOING-only. Refetching both is the only way to keep them consistent.
 *
 * What these hooks do NOT refresh is the feed payload, same rule as every other cycle: the
 * post card's own data belongs to another domain's cache and the caller passes an
 * `onSuccess` for it (see `use-post.ts`).
 */

/**
 * GET /v1/api/events/{postId}/attendees — every RSVP row, whatever the status.
 *
 * `undefined` disables it. Necessary rather than tidy: this is one request per event, with
 * no batch variant, so a feed of event cards that all fetched their attendees on mount would
 * be N requests before the reader has asked for anything.
 *
 * The rows carry `userId` and no name or picture (the endpoint returns the JPA entity), and
 * no endpoint resolves an id to a person. A consumer can therefore count these, and find the
 * viewer among them, but cannot list who is coming.
 */
export function useAttendees(postId: number | undefined) {
  return useQuery({
    // Non-null assertion is safe: `enabled` gates the fn and the key is only built with an id.
    queryKey: postKeys.attendees(postId!),
    queryFn: () => eventsApi.getAttendees(postId!),
    enabled: postId !== undefined,
  });
}

/**
 * GET /v1/api/events/{postId}/attendees/count — the GOING count.
 *
 * Kept as its own query even though `useAttendees` could be counted client-side, because the
 * two answer different questions and only this one matches the rule the server enforces: a
 * GOING is refused once this number reaches `EventDetails.maxAttendees`. A locally counted
 * figure would eventually disagree with the 400 the user gets.
 */
export function useAttendeeCount(postId: number | undefined) {
  return useQuery({
    queryKey: postKeys.attendeeCount(postId!),
    queryFn: () => eventsApi.getAttendeeCount(postId!),
    enabled: postId !== undefined,
  });
}

export interface RsvpVariables {
  postId: number;
  status: RsvpStatus;
}

/**
 * POST /v1/api/events/{postId}/rsvp?status=… — set or change this user's answer.
 *
 * DELIBERATELY NOT OPTIMISTIC, unlike the reaction toggle it superficially resembles.
 * A GOING can be refused — 400 "Event is full" once the GOING count reaches `maxAttendees` —
 * and the client cannot reliably predict that: its count is a cached number that other
 * people's RSVPs move without telling it. An optimistic write would routinely show the user
 * as attending an event that just refused them, and the rollback would arrive as a visible
 * flicker. The reaction case is different precisely because nothing can reject it.
 *
 * Invalidates both reads: the list (the row's status changed) and the count (which only
 * tracks GOING, so a GOING → INTERESTED switch moves it while the list length stays put).
 */
export function useRsvp(options?: PostMutationOptions<RsvpVariables>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, status }: RsvpVariables) => eventsApi.rsvp(postId, status),
    ...options,
    onSuccess: (data, variables, ...rest) => {
      queryClient.invalidateQueries({ queryKey: postKeys.attendees(variables.postId) });
      queryClient.invalidateQueries({ queryKey: postKeys.attendeeCount(variables.postId) });
      options?.onSuccess?.(data, variables, ...rest);
    },
  });
}

/**
 * POST /v1/api/events/{postId}/add-to-calendar — copy the event into the user's Google
 * Calendar, server-side.
 *
 * Nothing to invalidate: the write lands in Google's data, not in anything this app reads
 * back. `calendarStatus` in particular is unaffected — it reports whether a token row exists,
 * which this call requires but never changes.
 *
 * **The failure worth handling is a 404**, "Google Calendar not connected. Please authorize
 * first.", which is a precondition failure wearing a not-found's clothes. A caller that
 * renders "not found" for it will tell the user their event is gone when the truth is that
 * their calendar is not linked.
 */
export function useAddToGoogleCalendar(options?: PostMutationOptions<number>) {
  return useMutation({
    mutationFn: (postId: number) => eventsApi.addToGoogleCalendar(postId),
    ...options,
  });
}

/**
 * GET /v1/api/events/google/status — does this user have a stored Google token.
 *
 * No `enabled` parameter and no post id: the key is per-user and constant, so every event
 * card on a screen shares one cache entry and one request. That is what makes it safe to
 * gate a per-card button on.
 *
 * It is an existence check, not a health check — a token revoked at Google still reports
 * `connected: true` until `add-to-calendar` tries to use it. Treat it as "worth offering the
 * button", never as "the next call will succeed".
 */
export function useCalendarStatus() {
  return useQuery({
    queryKey: postKeys.calendarStatus(),
    queryFn: () => eventsApi.getCalendarStatus(),
  });
}

/**
 * GET /v1/api/events/google/auth-url — the Google consent URL to send the user to.
 *
 * `enabled` is REQUIRED, with no default, because the wrong default is dangerous in both
 * directions and the caller genuinely has to choose: fetching eagerly asks the backend to
 * mint a consent URL for every reader who will never click "connect", while defaulting to
 * false hides from the next reader that this hook fetches at all. Callers turn it on when
 * the connect affordance is actually on screen.
 *
 * `staleTime: Infinity` — the URL is a pure function of the user id and the configured
 * client, so refetching it can only ever return the same string.
 */
export function useGoogleAuthUrl(enabled: boolean) {
  return useQuery({
    queryKey: postKeys.googleAuthUrl(),
    queryFn: () => eventsApi.getGoogleAuthUrl(),
    enabled,
    staleTime: Infinity,
  });
}

/**
 * The viewer's own RSVP row, or `null` if they have not answered.
 *
 * A plain function rather than a hook so it composes with whatever already holds the list —
 * same reasoning as `groupComments`. `userId` is `undefined` while the profile query is in
 * flight, and that case has to return null rather than accidentally matching a row whose
 * `userId` is also undefined; the explicit guard is why this is not a one-line `find`.
 *
 * Note what "no row" means here, because the UI wording depends on it: there is no endpoint
 * to withdraw an RSVP, so a user who once answered always has a row. `null` means "never
 * answered", and NOT_GOING means "answered no" — two different states that must not be
 * rendered as the same empty button.
 */
export function findMyRsvp(attendees: EventRsvp[] | undefined, userId: number | undefined) {
  if (!attendees || userId === undefined) return null;
  return attendees.find((rsvp) => rsvp.userId === userId) ?? null;
}
