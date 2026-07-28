import api from '@/core/api/axios';
import type {
  AttendeeCount,
  CalendarStatus,
  EventRsvp,
  GoogleAuthUrl,
  RsvpStatus,
} from '../types/event';

/**
 * EventController (`com.socialapp.posts`) — 8 endpoints, 7 functions. Bare responses, no
 * wrapper.
 *
 * THE MISSING ONE IS `GET /events/google/callback`, AND IT IS MISSING ON PURPOSE. Google
 * redirects the browser to it after consent; it is `permitAll` in `SecurityConfig`, reads
 * `code` and `state` off the query string and stores the tokens server-side. The frontend
 * never calls it — a fetch from here would carry an Authorization header the endpoint does
 * not read and a `code` the frontend does not have. It is one of the two backend endpoints
 * the ledger counts as out of scope (the other is the MoMo webhook).
 *
 * NO ENDPOINT ANSWERS "WHAT DID I RSVP". Unlike reactions, which have `/reactions/me`, the
 * viewer's own status can only be found by fetching the attendee list and looking for their
 * own `userId` in it. The state layer (P2.4″b) is where that derivation belongs, not here.
 */
export const eventsApi = {
  /**
   * POST /v1/api/events/{postId}/rsvp?status=… — set or change this user's RSVP.
   *
   * `status` is a **query parameter, not a body** (`@RequestParam RsvpStatus status`), which
   * is why this is a POST with a null body. Sending it as JSON silently does nothing:
   * Spring would reject the missing parameter with a 400 before the service is reached.
   *
   * Upsert on the (post, user) pair, so switching GOING → NOT_GOING is this call alone. Two
   * things it is not: there is **no way to withdraw** an RSVP (no delete endpoint — the
   * nearest thing is NOT_GOING, which still leaves a row in the attendee list), and GOING is
   * refused with 400 "Event is full" once the GOING count reaches `EventDetails.maxAttendees`.
   * The cap applies only to GOING; INTERESTED and NOT_GOING are always accepted.
   *
   * 400 "Post is not an event" when `postId` is a post of any other type; 404 when it does
   * not exist. Both come from the same guard every function in this file goes through.
   */
  rsvp: (postId: number, status: RsvpStatus) =>
    api
      .post<void>(`/v1/api/events/${postId}/rsvp`, null, { params: { status } })
      .then((r) => r.data),

  /**
   * GET /v1/api/events/{postId}/attendees — every RSVP row for the event, whatever the
   * status, with `userId` but no name or picture. See `EventRsvp` for why that shapes the UI.
   */
  getAttendees: (postId: number) =>
    api.get<EventRsvp[]>(`/v1/api/events/${postId}/attendees`).then((r) => r.data),

  /**
   * GET /v1/api/events/{postId}/attendees/count — the GOING count only.
   *
   * Worth one call of its own rather than counting the attendee list client-side: this is
   * the number the backend itself compares against `maxAttendees`, so deriving a different
   * one locally would eventually disagree with the rule that rejects a full event.
   */
  getAttendeeCount: (postId: number) =>
    api.get<AttendeeCount>(`/v1/api/events/${postId}/attendees/count`).then((r) => r.data),

  /**
   * POST /v1/api/events/{postId}/add-to-calendar — copy the event into the user's Google
   * Calendar, server-side.
   *
   * **404 "Google Calendar not connected. Please authorize first." when the user has no
   * stored token** — a not-found used as a precondition failure. A UI that offers this
   * button without first checking `getCalendarStatus` has to treat that 404 as "connect
   * your calendar", not as "the event is gone".
   */
  addToGoogleCalendar: (postId: number) =>
    api.post<void>(`/v1/api/events/${postId}/add-to-calendar`).then((r) => r.data),

  /**
   * GET /v1/api/events/{postId}/export.ics — the event as iCalendar text.
   *
   * IT MUST GO THROUGH AXIOS, NOT AN `<a href>`. The endpoint is authenticated and this app
   * carries its JWT in an `Authorization` header from localStorage, so a plain link or
   * `window.open` arrives with no credentials and gets a 401. The legacy
   * `lib/api/events.ts` did exactly that — it exposed a `getExportIcsUrl` string builder —
   * and the bug went unnoticed only because nothing ever rendered it (0 UI consumers, per
   * the legacy inventory).
   *
   * Returns the file's text. Turning it into a download (Blob + object URL + a synthetic
   * click) needs the DOM and therefore belongs to the component, not to this layer;
   * `responseType: 'text'` keeps axios from trying to parse `text/calendar` as JSON.
   *
   * The body the backend builds is a hand-concatenated VCALENDAR with no `UID` and no
   * `DTSTAMP`, both of which RFC 5545 requires — strict importers may reject it. Not
   * fixable here.
   */
  exportIcs: (postId: number) =>
    api
      .get<string>(`/v1/api/events/${postId}/export.ics`, { responseType: 'text' })
      .then((r) => r.data),

  /**
   * GET /v1/api/events/google/auth-url — the consent URL to send the user to.
   *
   * Built per-caller (the `state` carries their user id), so it cannot be cached across
   * users or precomputed at build time.
   */
  getGoogleAuthUrl: () =>
    api.get<GoogleAuthUrl>('/v1/api/events/google/auth-url').then((r) => r.data),

  /**
   * GET /v1/api/events/google/status — `{ connected }`, meaning "a token row exists for this
   * user". Not a health check on that token; see `CalendarStatus`.
   */
  getCalendarStatus: () =>
    api.get<CalendarStatus>('/v1/api/events/google/status').then((r) => r.data),
};
