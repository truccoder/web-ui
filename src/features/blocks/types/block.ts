import type { components } from '@/core/api/schema.gen';

type Schemas = components['schemas'];

/**
 * Types for `BlockController` (`/v1/api/blocks`). BE package `com.socialapp.blocks`.
 *
 * THREE ENDPOINTS AND ONE SHAPE, which is unusual enough to be worth saying: block, unblock and
 * list, all keyed on a user id, all scoped to the caller. There is no path for reading anyone
 * else's blocks and the controller's own note says there should not be — who has blocked whom is
 * exactly the fact that would turn a safety tool into a way to discover you have been blocked.
 * Nothing on this side should try to infer it either.
 */

/**
 * One blocked person, as `GET /blocks` returns them.
 *
 * IT CARRIES A `username`, which matters: this is one of the few payloads that can link to
 * `/u/{username}`. It also carries `eliteScore`, deliberately unused here — see the list component.
 */
export type BlockedUser = Schemas['PublicUserResponse'];
