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
 *  - `authorFullName` / `authorProfilePictureUrl` stay optional: `toResponseDto` writes
 *    null when the author row is missing (`authorsById.get` miss), and the picture column
 *    is nullable regardless (measured null on the seed user).
 *  - `parentId` stays optional — null means top-level.
 */
export type PostComment = Required<
  Omit<Schemas['CommentResponseDto'], 'authorFullName' | 'authorProfilePictureUrl' | 'parentId'>
> & {
  authorFullName?: string;
  authorProfilePictureUrl?: string;
  parentId?: number;
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
