/**
 * `features/reputation` — mirrors the backend package `com.socialapp.reputation`
 * (ReputationController, 1 endpoint). Single public barrel; everything outside imports
 * from here.
 *
 * `RepScore` is exported for other features' identity rows: `eliteScore` ships inside the
 * feed and search payloads, so posts/newsfeed/search render the chip from data they
 * already hold, without calling this domain's endpoint.
 *
 * COMMENTS WERE THE ONE EXCEPTION AND ARE NOT ANY MORE. `CommentResponseDto` carried no
 * `authorEliteScore` and no `authorLevelName`, so a comment's identity row had nothing to draw a
 * chip from and `useReputations` existed to buy the pair one request per author. B22 shipped both
 * fields — the same join `FeedPostDataDto`'s mapper was already doing — so the thread reads them
 * off the payload.
 *
 * `features/chat` NOW CALLS THIS ENDPOINT, and it is not a regression of the rule above. A Stream
 * channel member carries a name and an avatar but no handle, and `/u/{username}` is keyed by
 * handle — so `ChatInfo` resolves the DM peer (and, since group members got profile links, every
 * member) through `useReputation` / `useReputations`. There is no payload this could be read off
 * instead: the membership lives in Stream, not in a backend DTO.
 */

export { reputationApi } from './api';

export {
  RepScore,
  formatRep,
  type RepScoreProps,
  ReputationCard,
  type ReputationCardProps,
  MyReputationCard,
  RepProgress,
  type RepProgressProps,
} from './components';

export { reputationKeys, useReputation, useReputations } from './hooks';

export type { Reputation } from './types';
