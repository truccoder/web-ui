import type { components } from '@/core/api/schema.gen';

type Schemas = components['schemas'];

/**
 * Types for CommentController (`/v1/api/posts/{postId}/comments`), derived from
 * `schema.gen.ts`. Cycle 2 of `features/posts` — same module, same barrel as cycle 1.
 */

/**
 * One comment as returned by `GET /posts/{postId}/comments`.
 *
 * Named `PostComment`, not `Comment`, deliberately: `lib.dom` already declares a global
 * `Comment` (the DOM node). A file that forgot to import ours would still compile against
 * that one and then fail somewhere unrelated. The prefix costs nothing and removes the
 * whole class of confusion.
 *
 * Nullability confirmed against `CommentEntity` + `CommentService.toResponseDto`:
 *  - `id` `postId` `authorId` `content` are `nullable = false` columns and the builder
 *    copies them straight off the entity → always present, tightened here.
 *  - `createdAt`/`updatedAt` are `@CreationTimestamp`/`@UpdateTimestamp`. Hibernate
 *    generates `@UpdateTimestamp` on INSERT too, so a never-edited comment still carries
 *    one (measured: a freshly created comment came back with `updatedAt === createdAt`).
 *    Both tightened — but that also means `updatedAt !== createdAt` is the ONLY way to
 *    tell an edited comment apart; there is no `isEdited` flag.
 *  - `authorFullName` / `authorProfilePictureUrl` / `authorUsername` / `myReaction` /
 *    `parentId` are nullable, and they are
 *    typed `| null` rather than `?:` on purpose. The generator writes every field optional,
 *    but the wire payload disagrees: Jackson runs at its default `ALWAYS` inclusion (the
 *    backend configures no `NON_NULL`), so these arrive as explicit
 *    `"parentId": null`, not as missing keys — measured on a real response. Modelling them
 *    optional would make `=== undefined` look like the right check and be wrong every time.
 *    `parentId === null` means top-level; `toResponseDto` writes a null name when the
 *    author row is missing, and the picture column is nullable regardless.
 */
export type PostComment = Required<
  Omit<
    Schemas['CommentResponseDto'],
    'authorFullName' | 'authorProfilePictureUrl' | 'parentId' | 'authorUsername' | 'myReaction'
  >
> & {
  authorFullName: string | null;
  authorProfilePictureUrl: string | null;
  /**
   * The author's handle, so a comment's name and face can link to `/u/{username}` the way the
   * post above them now does. Nullable for the same reason `authorFullName` is: the DTO is
   * built from a user row that may be missing.
   */
  authorUsername: string | null;
  /**
   * The reader's own reaction to this comment, or null when they have not reacted — which is
   * the common case, so it must never be modelled as `?:`. Not read yet: the like control in
   * `CommentItem` is still disabled pending the rest of B14.
   */
  myReaction: NonNullable<Schemas['CommentResponseDto']['myReaction']> | null;
  parentId: number | null;
};

/**
 * `POST /posts/{postId}/comments`.
 *
 * `content` is required despite the spec marking it optional: `CommentService.validateContent`
 * rejects blank with a 400 ("Comment content must not be blank").
 *
 * THE THREAD IS TWO LEVELS DEEP, NOT ARBITRARY. `validateParentComment` throws
 * "Replies can only be made to top-level comments" when the parent itself has a `parentId`,
 * so a reply-to-a-reply must carry the top-level comment's id, not the id of the comment
 * being answered. A UI that renders nested replies has to flatten to depth 2 — do not build
 * a recursive tree and expect the backend to accept it.
 */
export type CreateCommentRequest = {
  content: string;
  parentId?: number;
};

/**
 * `PUT /posts/{postId}/comments/{commentId}`. Content-only; author-only
 * (`verifyAuthor` → 403). The parent link is not editable.
 */
export type UpdateCommentRequest = {
  content: string;
};
