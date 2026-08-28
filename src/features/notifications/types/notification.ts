import type { components } from '@/core/api/schema.gen';

type Schemas = components['schemas'];

/**
 * Types for NotificationController (`GET /v1/api/notifications`, `/unread-count`,
 * `POST /{id}/read`, `/read-all`), derived from `schema.gen.ts`.
 *
 * NO REALTIME TRANSPORT EXISTS. Grepping the whole backend for `WebSocketConfig`,
 * `@EnableWebSocketMessageBroker`, `SseEmitter` and `text/event-stream` returns nothing, so
 * "new notification arrived" can only be discovered by asking again. That is a fact about the
 * backend, not an inference from the endpoint names, and it decides the shape of the state
 * layer: polling, not a subscription. Do not design a socket client against these types.
 */

/**
 * WHY `AppNotification` AND NOT `Notification`. `Notification` is a global in TypeScript's DOM
 * lib (the Web Notifications API constructor). A domain type with that name resolves fine
 * inside this module but shadows the global wherever it is imported, and reads as the browser
 * type to anyone skimming. The prefix is the cost of not having that ambiguity in every file
 * that renders the bell.
 */

/**
 * Fields the backend always sends with a real value.
 *
 * Confirmed against `NotificationEntity` + `V15__create_notifications_table.sql` rather than the
 * spec, which marks everything optional: `id` is the PK, `type`/`title`/`channel` are
 * `NOT NULL` columns, `createdAt` is `@CreationTimestamp`, and `isRead` is both a
 * `@Builder.Default false` on the entity and a `DEFAULT FALSE` column — every row is written
 * through `NotificationService.saveNotification`, which uses that builder.
 *
 * Everything else is genuinely nullable in the schema: `actor_id` (`ON DELETE SET NULL`),
 * `body`, `reference_id`, `reference_type`.
 */
type AlwaysPresent = 'id' | 'type' | 'title' | 'channel' | 'isRead' | 'createdAt';

/**
 * One notification — `NotificationResponseDto` with nullability corrected.
 *
 * EVERY KEY IS PRESENT, AND EVERYTHING OPTIONAL IS `| null` RATHER THAN `?:`. Jackson runs at
 * its default `ALWAYS` inclusion, so an absent value arrives as `"body": null` — the key is
 * there. This project has paid for the distinction twice (a `=== undefined` check that
 * misclassified every top-level comment, and a `!== undefined` check on a null cap that made
 * every uncapped event render as full, because `0 >= null` is true), so it is encoded in the
 * type instead of left to callers. Compare a nullable number against a bound only after
 * excluding null.
 *
 * `postId` IS THE ONE EXCEPTION AND IT IS DELIBERATE ON THE BACKEND'S SIDE. B23 added it carrying
 * `@JsonInclude(NON_NULL)` — the only field on this DTO that does — so a friend request or a book
 * purchase omits the key entirely instead of shipping `"postId": null` on every row to say
 * nothing. The mapped type still declares it (as `number | undefined | null`), and the rule for
 * reading it is therefore `== null`, which catches both shapes. See `hrefFor`, its only reader.
 */
export type AppNotification = {
  [K in keyof Required<Schemas['NotificationResponseDto']>]: K extends AlwaysPresent
    ? NonNullable<Schemas['NotificationResponseDto'][K]>
    : Schemas['NotificationResponseDto'][K] | null;
};

/**
 * The `NotificationType` enum, as the backend spells it.
 *
 * ALL 9 ARE EMITTED — the enum used to hold 11 with four of them unproducible, and both halves of
 * that gap are now closed. Grepping `NotificationType.` outside the notifications package finds
 * `POST_LIKED` (PostReactionService), `POST_COMMENTED` (CommentService), `POST_TAGGED`
 * (NewsfeedService), `FRIEND_REQUEST`/`FRIEND_ACCEPTED` (FriendshipService), `EVENT_RSVP`
 * (EventService, `b0d1539`), `EVENT_REMINDER` (EventReminderScheduler, `4ff5d5f`), `BOOK_REVIEW`
 * (BookReviewService) and `BOOK_PURCHASED` (MomoService). `POST_SHARED` and `SYSTEM` were deleted
 * from the enum instead of given producers (`f0dc820`).
 *
 * `EVENT_REMINDER` CARRIES `actorId: null` — a scheduler raised it, so there is no person who did
 * it. Anything rendering an avatar from `actorId` must handle that; `AppNotification` already
 * leaves the field nullable, which is why nothing broke when the producer landed.
 */
export type NotificationType = NonNullable<Schemas['NotificationResponseDto']['type']>;

/** Which transports the backend tried for this notification. */
export type NotificationChannel = NonNullable<Schemas['NotificationResponseDto']['channel']>;

/**
 * The `Page<T>` envelope Spring serialises around the list.
 *
 * `Pick` RATHER THAN `Omit`, DELIBERATELY: picking a key the generated schema does not have is
 * a compile error, so a backend rename surfaces here at `tsc` time. `Omit` of a vanished key
 * succeeds silently, which is exactly the drift this file exists to catch.
 *
 * `pageable` and `sort` are dropped: they are Spring's internal paging state (offset, sort
 * orders, `paged` flags), not something a caller of this domain should read or depend on.
 *
 * NO SHARED `Page<T>` IS DEFINED HERE. The legacy `lib/types` had one generic envelope reused
 * by every domain, which is the cross-domain bucket CLAUDE.md §4 forbids; the generator already
 * emits a concrete `Page<Dto>` schema per DTO, so each feature derives its own from the schema
 * it actually receives.
 */
type NotificationPageEnvelope = Required<
  Pick<
    Schemas['PageNotificationResponseDto'],
    'number' | 'size' | 'totalElements' | 'totalPages' | 'first' | 'last' | 'empty'
  >
>;

/**
 * One page of notifications, newest first (`findByRecipientIdOrderByCreatedAtDesc`).
 *
 * MIND THE OFF-BY-ONE, IT IS REAL AND IT IS ASYMMETRIC. The request parameter is **1-based** —
 * `@RequestParam(defaultValue = "1") @Positive int page`, and the service computes
 * `PageRequest.of(page - 1, size)` — so `page=0` is a 400, not the first page. The response's
 * `number`, being Spring's own, is **0-based**. Requesting page 1 returns `number: 0`. Anything
 * deriving "the next page to ask for" from `number` must add 2, not 1.
 */
export type NotificationPage = NotificationPageEnvelope & {
  content: AppNotification[];
};

/**
 * `GET /unread-count`.
 *
 * `UnreadCountResponse` is a Java record over a primitive `int`, so `count` cannot be null or
 * absent however the spec marks it.
 */
export type UnreadCount = Required<Schemas['UnreadCountResponse']>;
