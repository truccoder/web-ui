import type { components } from '@/core/api/schema.gen';

type Schemas = components['schemas'];

/**
 * Types for `com.socialapp.posts` — cycle 1 (PostController), derived from
 * `schema.gen.ts`.
 *
 * NOTE ON REQUEST DTOs: the Java request records carry no `@NotNull`, so every generated
 * field is optional and the real rules live in `PostService`. They are documented on each
 * type rather than encoded, except where every caller genuinely has the value.
 */

/** Post kinds. `BOOK` is not accepted by `createPost` — see `postsApi.createBookPost`. */
export type PostType = NonNullable<Schemas['CreatePostRequestDto']['postType']>;

/** Who can see the post. Tagging is validated against this (`PostService.validateTags`). */
export type PostVisibility = NonNullable<Schemas['CreatePostRequestDto']['visibility']>;

/** How a location was resolved. */
export type LocationType = NonNullable<Schemas['CreatePostRequestDto']['locationType']>;

/**
 * Resolved place attached to a post. Every field is Gemini-provided and may be missing, so
 * none are tightened. `display_name` really is snake_case on the wire.
 */
export type LocationDetails = Schemas['LocationDetails'];

/** Per-kind payloads, carried on the create/update request under their own key. */
export type EventDetails = Schemas['EventDetails'];
export type CodeSnippetDetails = Schemas['CodeSnippetDetails'];
export type ArticleDetails = Schemas['ArticleDetails'];
export type QnaDetails = Schemas['QnaDetails'];
export type PollDetails = Schemas['PollDetails'];
export type LinkDetails = Schemas['LinkDetails'];
export type QuizQuestion = Schemas['QuizQuestion'];
export type QuizDetails = Schemas['QuizDetails'];

/**
 * The quiz as a READER receives it — no answer key.
 *
 * TWO DIFFERENT DTOs, AND CONFLATING THEM IS WHAT WENT WRONG. `QuizDetails`/`QuizQuestion` are
 * the author's shape: they carry `correctOptionIndex` and `explanation`, and travel on
 * `CreatePostRequestDto`/`UpdatePostRequestDto`. What comes *back* on `FeedPostDataDto` and
 * `PostDto` is `PublicQuizDetailsDto`, which has `question` and `options` and nothing else —
 * the backend stopped shipping the answer key with the questions.
 *
 * `QuizTaker` was typed against the author's shape and compiled anyway, because every field in
 * a generated DTO is optional, so the extra keys read as merely-absent rather than as wrong.
 * That silence is the whole reason this alias exists: the reader side now names the DTO it is
 * actually handed, and a future edit that reaches for `correctOptionIndex` fails to compile
 * instead of quietly rendering nothing.
 */
export type PublicQuizDetails = Schemas['PublicQuizDetailsDto'];

/** Book metadata for `createBookPost`. `title` is the one field the spec marks required. */
export type CreateBookRequest = Schemas['CreateBookRequestDto'];

/**
 * `POST /v1/api/posts` (and the `metadata` part of `POST /v1/api/posts/books`).
 *
 * Rules enforced by `PostService`, not by this type:
 * - `postType: 'BOOK'` is **rejected** here — use `createBookPost`, which sets the type itself.
 * - `EVENT` requires `eventDetails` (`validateEventDetails`).
 * - `quizDetails`, when present, is validated (`validateQuizDetails`).
 * - tagging is checked against `visibility` + `content`; content also passes the moderation
 *   rule engine, which can reject the call outright.
 *
 * `postType` and `visibility` are required here even though the API tolerates their absence:
 * every real caller has both, and a post with neither cannot be rendered or filtered.
 */
export type CreatePostRequest = Omit<Schemas['CreatePostRequestDto'], 'postType' | 'visibility'> & {
  postType: PostType;
  visibility: PostVisibility;
};

/**
 * `PUT /v1/api/posts/{postId}`. Same shape minus the fields that cannot change after
 * creation: `postType`, `eventDetails` and `bookDetails` are absent from the Java DTO.
 */
export type UpdatePostRequest = Omit<Schemas['UpdatePostRequestDto'], 'visibility'> & {
  visibility?: PostVisibility;
};
