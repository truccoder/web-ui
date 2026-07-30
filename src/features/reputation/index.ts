/**
 * `features/reputation` — mirrors the backend package `com.socialapp.reputation`
 * (ReputationController, 1 endpoint). Single public barrel; everything outside imports
 * from here.
 *
 * `RepScore` is exported for other features' identity rows: `eliteScore` ships inside the
 * feed and search payloads, so posts/newsfeed/search render the chip from data they
 * already hold, without calling this domain's endpoint.
 */

export { reputationApi } from './api';

export {
  RepScore,
  formatRep,
  type RepScoreProps,
  ReputationCard,
  type ReputationCardProps,
  MyReputationCard,
} from './components';

export { reputationKeys, useReputation } from './hooks';

export type { Reputation } from './types';
