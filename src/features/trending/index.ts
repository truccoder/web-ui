/**
 * `features/trending` — mirrors the backend package `com.socialapp.trending`
 * (TrendingController: 1 endpoint).
 *
 * THE ONLY DOMAIN WHOSE CONTENT NOBODY IN THIS APP WROTE. Items are crawled from Hacker News,
 * dev.to, GitHub, Reddit, Medium and HBR on a schedule, classified by Gemini into one category,
 * and stored. Nothing here creates, edits, reacts to or comments on them — every card is a link
 * that leaves the app, and that is the whole interaction model.
 *
 * NO CROSS-FEATURE DEPENDENCIES AT ALL. A crawled item has no author inside this system, so there
 * is no identity row, no Elite Score and no friendship graph to consult — this is the smallest
 * dependency surface of any feature in the project, and the cleanest extraction test.
 */

export { trendingApi, type TrendingParams } from './api';

export { useTrending, trendingKeys } from './hooks';

export {
  TrendingList,
  type TrendingListProps,
  TrendingCard,
  type TrendingCardProps,
  TrendingFilters,
  type TrendingFiltersProps,
} from './components';

export type {
  TrendingItem,
  TrendingPage,
  TrendingSource,
  TrendingCategory,
  TrendingTimeRange,
} from './types';
