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

/**
 * `PUT /posts/{postId}/comments/{commentId}/reactions` — the same body, narrowed to the one value
 * a comment accepts.
 *
 * B24: `CommentReactionService.upsertReaction` throws 400 for the other six, and
 * `V73__comments_are_like_only.sql` rewrote the rows that predate the rule. The backend kept the
 * shared request DTO because a POST still takes all seven, so the narrowing has to be expressed
 * on this side rather than read off the schema — which is exactly why it is a named type and not
 * an inline literal at the call site.
 */
export type LikeCommentRequest = {
  reactionType: 'LIKE';
};

/**
 * One page of "who reacted".
 *
 * THE ROWS ARE `PublicUserResponse`, the same shape the block list renders — so they carry a
 * `username` and can link to `/u/{username}`, which the feed's own author field still cannot
 * (B28). A reactor is more reachable than the person whose post they reacted to.
 *
 * `totalCount` IS THE TOTAL FOR THE FILTER ASKED FOR, not for the post: request `type=LIKE` and it
 * counts likes. Nothing may present it as "reactions on this post" while a filter is active.
 */
export type ReactorPage = {
  reactors: Schemas['PublicUserResponse'][];
  nextCursor?: number;
  hasMore: boolean;
  totalCount: number;
};
