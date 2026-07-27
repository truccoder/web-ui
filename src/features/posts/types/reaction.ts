import type { components } from '@/core/api/schema.gen';

type Schemas = components['schemas'];

/**
 * Types for PostReactionController (`/v1/api/posts/{postId}/reactions`), derived from
 * `schema.gen.ts`.
 */

/**
 * The five values of the Java enum `com.socialapp.posts.entity.enums.ReactionType`.
 *
 * Taken off `UpsertPostReactionRequestDto` rather than written out: that DTO's field is
 * `@NotNull`, so the generator emits it as required and the union comes through without an
 * `undefined` to strip. Adding a sixth reaction in Java therefore breaks compilation here
 * instead of silently going unhandled.
 */
export type ReactionType = Schemas['UpsertPostReactionRequestDto']['reactionType'];

/**
 * `GET /posts/{postId}/reactions/me`.
 *
 * `reactionType: null` is the normal "I have not reacted" state, not an error — the service
 * comments on this explicitly and returns `new MyReactionResponseDto(null)` rather than a
 * 404. Measured on the wire: the key is present with a null value
 * (`{"reactionType":null}`), so the field is modelled as nullable-but-present instead of
 * optional. Callers should still treat it as falsy rather than testing `=== null`.
 */
export type MyReaction = {
  reactionType: ReactionType | null;
};

/**
 * `PUT /posts/{postId}/reactions` — one row per (user, post), so switching from LIKE to
 * LOVE is this same call, not a delete plus a create.
 */
export type UpsertReactionRequest = {
  reactionType: ReactionType;
};
