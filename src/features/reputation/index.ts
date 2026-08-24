/**
 * `features/reputation` — mirrors the backend package `com.socialapp.reputation`
 * (ReputationController, 1 endpoint). Single public barrel; everything outside imports
 * from here.
 *
 * `RepScore` is exported for other features' identity rows: `eliteScore` ships inside the
 * feed and search payloads, so posts/newsfeed/search render the chip from data they
 * already hold, without calling this domain's endpoint.
 *
 * COMMENTS ARE THE ONE EXCEPTION, and it is a gap rather than a change of policy.
 * `CommentResponseDto` carries no `authorEliteScore` and no `authorLevelName`, so a comment's
 * identity row cannot render the chip from data it holds — there is none. `useReputations` is
 * exported for exactly that case and documents the cost. When the backend adds the two fields to
 * the comment DTO (the same join `FeedPostDataDto`'s mapper already performs), the thread should
 * read them off the payload and this hook should lose its only caller.
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
