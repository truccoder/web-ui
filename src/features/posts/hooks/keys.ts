import type { LocationResolutionRequest } from '../types/location';

/**
 * Query keys for `features/posts`, all under one namespace.
 *
 * `comments` is declared here in cycle 1 even though the query itself arrives in cycle 2:
 * `acceptAnswer` (a cycle-1 endpoint, see `postsApi`) changes the accepted answer on a
 * thread, so it has to invalidate that thread. Same module, one barrel — the checkpoint
 * split is a schedule, not a boundary.
 */
export const postKeys = {
  all: ['posts'] as const,
  post: (postId: number) => ['posts', postId] as const,
  comments: (postId: number) => ['posts', postId, 'comments'] as const,
  locationSearch: (request: LocationResolutionRequest) => ['posts', 'locations', request] as const,
};
