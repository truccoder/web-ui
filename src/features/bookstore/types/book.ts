import type { components } from '@/core/api/schema.gen';

type Schemas = components['schemas'];

/**
 * Types for the `com.socialapp.bookstore` package, derived from `schema.gen.ts`.
 *
 * The package holds TWO controllers: `BookController` (`/books`, 8 endpoints) and
 * `PaymentController` (`/payments`, 3). `/payments` looks like it belongs elsewhere, but feature
 * boundaries mirror BE package boundaries 1:1 (CLAUDE.md §4), so both live here rather than in a
 * `features/payments/`. This is the deliberate oddity recorded in the ledger's boundary note.
 *
 * `POST /v1/api/posts/books` (createBookPost) is NOT part of this domain — it sits on
 * `PostController` and is already counted in the 22 endpoints of `posts`. Filtering the spec by
 * path for `books|payment` yields 12; the correct count here is 11.
 *
 * Every field is `| null` rather than `?:`, for the reason recorded in `features/newsfeed`:
 * Jackson serialises at `ALWAYS`, so an absent value arrives as an explicit null, never as a
 * missing key. Measured shapes are in `docs/ledger/findings/bookstore.md`.
 */

/** The only two formats `BookService` accepts on upload; anything else is a `ValidationException`. */
export type BookFileFormat = NonNullable<Schemas['BookResponseDto']['fileFormat']>;

/**
 * What a book is ABOUT — the topic the Library filters by. BE `15090af`, migration V78.
 *
 * ONE BACKEND ENUM, THREE FRONTEND DECLARATIONS, ON PURPOSE. `LearningCategory` lives in
 * `com.socialapp.common.enums` and is carried by books, roadmaps and saved AI explanations alike;
 * there is no `features/common` here to mirror that package into, and lifting a nine-value union
 * into `shared/` would put a domain concept in the folder whose whole rule is that it holds none.
 * So each feature derives the union from ITS OWN DTO — the same shape `PrimaryRole` (knowledge)
 * and `TrendingCategory` (trending) already take — and the three stay identical because they are
 * all generated from one Java enum. If the backend ever splits them, the three declarations split
 * with it and nothing has to be untangled.
 *
 * THE LABELS ARE NOT DUPLICATED, and that is the half that would actually have drifted: all three
 * screens read `learningCategory.*` from the message bundles, so a topic is worded once.
 *
 * `OTHER` IS A REAL TOPIC WITH REAL BOOKS IN IT, not an error state to hide. Every row that
 * existed before V78 carries it (the column defaulted), and so does anything the seed did not
 * name.
 */
export type LearningCategory = NonNullable<Schemas['BookResponseDto']['category']>;

/**
 * One book.
 *
 * TWO TRAPS LIVE IN THIS DTO. Both were measured on the running backend (findings §6), and both
 * are the kind that produce a plausible-looking UI that is quietly wrong.
 *
 * ---
 *
 * TRAP 1 — `purchased` DOES NOT MEAN "I can read this".
 *
 * The backend computes it as `!isFree && requesterId != null && (isAuthor || hasCompletedPurchase)`.
 * The `!isFree` leading term means **a free book always reports `purchased: false`, even to its own
 * author**. Measured on a free book owned by the caller:
 *
 *     { "isFree": true, "purchased": false, "downloadUrl": "http://.../books/...?X-Amz-Signature=..." }
 *
 * Branching a "Read" button on `purchased` therefore hides it on every free book in the app.
 * `purchased` answers exactly one question — whether to offer the Buy button — and even then the
 * condition is `!isFree && !purchased`.
 *
 * ---
 *
 * TRAP 2 — `downloadUrl` and `previewUrl` are MUTUALLY EXCLUSIVE, and that is the real signal.
 *
 * `BookService.toResponseDto` is an if/else: when `isFree || purchased` it presigns `downloadUrl`
 * and leaves `previewUrl` null; otherwise it presigns `previewUrl` and leaves `downloadUrl` null.
 * Exactly one of the two is non-null — never both, never neither.
 *
 * SO THE RULE FOR EVERY CONSUMER IS: use `downloadUrl != null` to decide "full text or sample
 * only". The backend has already evaluated (free ∨ purchased ∨ is-author) and packed the answer
 * into which field it filled. Re-deriving that from `isFree`/`purchased`/`authorId` on this side
 * copies the rule a second time, and the copy will drift.
 *
 * The two fields are not modelled as a discriminated union here because the generated schema
 * cannot express the exclusivity and hand-writing a union would mean retyping the DTO — a second
 * source of truth, which CLAUDE.md §2a forbids. The invariant is documented instead, and enforced
 * by consumers reading `downloadUrl` rather than reconstructing it.
 *
 * ---
 *
 * `coverImageUrl` is presigned at read time like the other two, as of the backend fix for B4.
 * It used to be echoed RAW from `t_books.cover_image_url`, a column the write path filled with a
 * 24-hour presigned URL, so covers died after a day. Verified at F-C: a book posted two days
 * before came back with an `X-Amz-Date` of the current day.
 *
 * Consumers should still carry an image `onError` fallback — a presigned URL can expire in a
 * long-lived tab, and an object can go missing from storage — but they are no longer working
 * around a defect. Do not try to repair a failing URL by prefixing a base URL here.
 */
export type Book = {
  [K in keyof Required<Schemas['BookResponseDto']>]: Required<Schemas['BookResponseDto']>[K] | null;
};

/**
 * One review.
 *
 * `userId` ONLY — no name, no avatar, and the backend has no endpoint to look a user up by id
 * (only `/profile/me`). So a review list can show the text and the stars but **cannot show who
 * wrote it**. Same family of limitation as `/attendees` in `posts` and "no public profile
 * endpoint" in CLAUDE.md Phase 3.1. Not a UI oversight to be fixed later — a data ceiling.
 *
 * There is no `updatedAt`, and `createdAt` does NOT change when a review is edited (the endpoint
 * upserts — see `CreateReviewRequest`). A timestamp shown next to a review is therefore the moment
 * it was FIRST written, whatever it says now.
 */
export type BookReview = {
  [K in keyof Required<Schemas['BookReviewResponseDto']>]:
    | Required<Schemas['BookReviewResponseDto']>[K]
    | null;
};

/**
 * Star histogram for one book.
 *
 * A Java `record` of six primitive `long`s, so every field is genuinely always present — hence
 * `NonNullable` rather than the `| null` used above. A book with no reviews returns all six as
 * `0`, not an empty object (measured), so consumers can read `totalRatings === 0` for the empty
 * state instead of guarding each bucket.
 */
export type RatingBreakdown = {
  [K in keyof Required<Schemas['RatingBreakdownDto']>]: NonNullable<
    Schemas['RatingBreakdownDto'][K]
  >;
};

/**
 * Request body for `POST /books/{bookId}/reviews`.
 *
 * `rating` is required and constrained to 1..5 by bean validation; `feedback` is free text and
 * optional. Violating the range is a **422** whose `details` array carries a readable per-field
 * message; sending the wrong TYPE is a **400** with `details: null` (findings §2). That split is
 * bean-validation vs deserialization, not one controller being different — the API layer documents
 * it at the call site.
 */
export type CreateReviewRequest = {
  rating: NonNullable<Schemas['CreateReviewRequestDto']['rating']>;
  feedback?: Schemas['CreateReviewRequestDto']['feedback'];
};

/**
 * `{ url }` — the shape both `/download` and `/preview` return.
 *
 * A Java `record` whose only field is filled from a presign that throws on failure, so `url` is
 * never null on a 200.
 */
export type PresignedUrl = {
  url: NonNullable<Schemas['DownloadUrlResponse']['url']>;
};

/**
 * What MoMo hands back when a payment is opened.
 *
 * `transactionRef` is the backend's own order id and is always set. `paymentUrl` and `qrCode` are
 * read out of MoMo's response map (`data.get("payUrl")` / `data.get("qrCodeUrl")`), so they are
 * nullable in the honest sense — a MoMo response missing them yields nulls here rather than an
 * error.
 */
export type PaymentIntent = {
  transactionRef: NonNullable<Schemas['PaymentResponseDto']['transactionRef']>;
  paymentUrl: Schemas['PaymentResponseDto']['paymentUrl'] | null;
  qrCode: Schemas['PaymentResponseDto']['qrCode'] | null;
};

/**
 * Result of asking the backend to re-check a payment against MoMo.
 *
 * A `record` of a `String` and a primitive `boolean`, both always present. This exists because the
 * webhook is server-to-server and may not have landed by the time the user is redirected back —
 * `/payment/success` polls this rather than trusting the redirect.
 */
export type PaymentStatus = {
  [K in keyof Required<Schemas['PaymentStatusResponse']>]: NonNullable<
    Schemas['PaymentStatusResponse'][K]
  >;
};

/**
 * One page of the library (`GET /v1/api/books`).
 *
 * THE ENDPOINT THAT DID NOT EXIST UNTIL 2026-08-09. Every note in this feature about "there is no
 * `GET /books`, so the only way to reach a book is its author or a post that embeds it" was true
 * when written and is not any more. `getLibrary` is a plain catalogue read.
 *
 * CURSOR-PAGINATED, matching `/posts/public` and for the same reason: the rows are ordered by an
 * id that keeps climbing, and offset paging over a table being written to shows the reader the
 * same book twice. `nextCursor` is null once `hasMore` is false.
 *
 * The items are the SAME `Book` the rest of this feature uses, so both traps on that type apply
 * here in full — read `downloadUrl != null` for access, never `purchased`.
 */
export type BookPage = {
  items: Book[];
  nextCursor: number | null;
  hasMore: boolean;
};
