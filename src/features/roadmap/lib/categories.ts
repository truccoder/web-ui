import type { LearningCategory } from '../types/roadmap';

/**
 * The nine topics a track can be filed under, in the backend enum's own order.
 *
 * LISTED RATHER THAN DERIVED, because a TypeScript union has no runtime value to map over — the
 * same reason `TrendingFilters` lists its eight categories by hand. Order matches
 * `LearningCategory.java` so the reader's filter and the author's picker can never look like
 * different sets, and `OTHER` is last in both.
 *
 * IT LIVES HERE RATHER THAN IN A COMPONENT, unlike the identical arrays in `bookstore` and
 * `knowledge`, for one reason: this feature has TWO callers. `RoadmapList` offers the topics to
 * filter by and `RoadmapAdminPanel` offers the same topics to file a new track under, and a
 * picker that could offer a value the filter does not is a track nobody can find again. One
 * caller keeps its list beside itself; two share one.
 *
 * "EVERY TOPIC" IS NOT A MEMBER. It is the absence of a filter, so the reader's list prepends it
 * in the markup and the author's picker — which sets one value on one row — has no use for it.
 */
export const LEARNING_CATEGORIES: LearningCategory[] = [
  'BACKEND',
  'FRONTEND',
  'MOBILE',
  'DEVOPS',
  'DATA_ML',
  'SECURITY',
  'QA',
  'CAREER',
  'OTHER',
];
