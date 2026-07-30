import type { components, operations } from '@/core/api/schema.gen';

type Schemas = components['schemas'];

/**
 * Types for EventController (`/v1/api/events`), derived from `schema.gen.ts`.
 *
 * WHY THIS LIVES IN `features/posts` AND NOT `features/events`: the controller sits in the
 * backend package `com.socialapp.posts`, and the frontend mirrors backend packages 1:1
 * (CLAUDE.md §4). The path prefix is the odd one out, not the placement — the ledger records
 * it as a known boundary note so nobody "fixes" it later. Events are also inseparable from
 * posts in the data: an event *is* a post of type EVENT carrying an `EventDetails` block,
 * and every endpoint here starts by loading that post and rejecting it if it is not an event.
 */

/**
 * The three values of `com.socialapp.posts.entity.enums.RsvpStatus`.
 *
 * Taken from the `rsvp` operation's **query** parameter rather than from `EventRsvpEntity`:
 * the query param is required, so the generator emits the union without an `undefined` to
 * strip, while every entity field is optional. Adding a fourth status in Java breaks
 * compilation here instead of silently going unhandled.
 */
export type RsvpStatus = operations['rsvp']['parameters']['query']['status'];

/**
 * One row of `GET /events/{postId}/attendees`.
 *
 * THE ATTENDEE LIST IS RENDERABLE NOW (BE `1299a0e`). It used to return `List<EventRsvpEntity>`
 * straight out of the repository — `userId` and nothing else — and since the backend exposes only
 * `/profile/me`, there was no second call that could turn an id into a person. The list was
 * literally undisplayable. `EventAttendeeDto` joins `fullName` and `profilePictureUrl` in, so an
 * attendee row can show who it is.
 *
 * WHAT WENT AWAY WITH THE ENTITY: `id`, `postId` and `createdAt`. The row's own key and its
 * back-reference were never useful to a caller that asked for one post's attendees, and
 * `createdAt` came back renamed as `respondedAt`, which is what it always meant.
 *
 * THE LIST IS STILL EVERY RSVP, NOT THE GUEST LIST — NOT_GOING and INTERESTED rows come back
 * alongside GOING. That is deliberate, and the fix is now available at the source: pass
 * `status` to narrow server-side (`eventsApi.getAttendees`) instead of filtering client-side.
 * `/attendees/count` remains GOING-only.
 *
 * NULLABILITY, read from `EventService.getAttendees` rather than the spec (which marks
 * everything optional):
 *  - `userId`, `status`, `respondedAt` always arrive — RSVP columns, `respondedAt` from
 *    `@CreationTimestamp`.
 *  - `fullName` and `profilePictureUrl` are `null` when the user row is gone: the service does a
 *    batch `findAllById` and maps a miss to null rather than dropping the row, so a deleted
 *    account still counts as an attendee but has no identity to show.
 */
export type EventAttendee = {
  [K in keyof Required<Schemas['EventAttendeeDto']>]: K extends 'fullName' | 'profilePictureUrl'
    ? string | null
    : Required<Schemas['EventAttendeeDto']>[K];
};

/**
 * `GET /events/{postId}/attendees/count` — **GOING only**, from
 * `countByPostIdAndStatus(postId, GOING)`.
 *
 * Do not read this as "how many people responded": someone who answered INTERESTED is in
 * the attendee list but not in this number. It is also the number `rsvp` checks against
 * `EventDetails.maxAttendees` before accepting a GOING.
 */
export type AttendeeCount = Required<Schemas['AttendeeCountResponse']>;

/**
 * `GET /events/google/auth-url` — where to send the user to authorise Google Calendar.
 *
 * The URL is built with `state = <the caller's own user id>`, in plain text. That is a real
 * weakness in the backend rather than a detail of this type: `/events/google/callback` is
 * `permitAll` in `SecurityConfig` and trusts `state` as the account to attach the resulting
 * tokens to, so the value has to be an unguessable, session-bound nonce. Recorded in
 * `findings/posts.md`; the frontend cannot compensate for it, and must not pretend to by
 * generating a state of its own — the backend would ignore it.
 */
export type GoogleAuthUrl = Required<Schemas['AuthUrlResponse']>;

/**
 * `GET /events/google/status` — whether this user has a stored Google Calendar token.
 *
 * `isConnected` is a bare "is there a row", not a liveness check: a token whose refresh has
 * been revoked at Google still reports `connected: true` and only fails when
 * `add-to-calendar` actually tries to use it. So this is the right thing to gate the button
 * on, and the wrong thing to trust as proof the next call will succeed.
 */
export type CalendarStatus = Required<Schemas['CalendarStatusResponse']>;
