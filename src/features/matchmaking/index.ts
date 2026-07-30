/**
 * `features/matchmaking` — public surface. BE package `com.socialapp.matchmaking`.
 *
 * One controller, five endpoints: create a project (with its positions), apply to a position,
 * accept an application, reject an application, and read the candidate shortlist for a position.
 *
 * THIS DOMAIN CANNOT CURRENTLY BE BUILT INTO A WORKING SCREEN, and that is a property of the API
 * rather than of the work not being done. Three measured facts (2ab; full write-up in
 * `findings/matchmaking.md`):
 *
 *  1. **Nothing lists anything.** No endpoint returns projects, positions or applications, and the
 *     repositories contain no unused finders to expose either. So the `positionId` and
 *     `applicationId` that four of the five endpoints require cannot be obtained from the API.
 *  2. **`createProject` discards the ids it has.** The service returns a saved `ProjectEntity`
 *     carrying the project's id and every position's id; the controller declares `void` and drops
 *     it. Measured: creating a project answers 200 with an empty body, and the ids were only
 *     readable straight from Postgres.
 *  3. **The one read endpoint answers 500.** `findBySkillsMatch` is the backend's only native
 *     query and it names the table without its schema, so it fails everywhere.
 *
 * Raised as B24. Types, api and hooks are complete and correct against the contract as it stands —
 * when the reads arrive, nothing in this module changes; a UI simply becomes possible.
 *
 * `SuggestedCandidate` IS NARROW ON PURPOSE, not by accident: the backend deliberately withholds
 * work history, explanation style and interested domains from a project owner. Do not try to
 * enrich it — and there is no public profile endpoint to enrich it from.
 *
 * Populated at P2.16ab with types + api + hooks. UI is blocked pending B24.
 */

export { matchmakingApi } from './api';

export {
  matchmakingKeys,
  useSuggestedCandidates,
  useCreateProject,
  useApplyToPosition,
  useAcceptApplication,
  useRejectApplication,
  type MatchmakingMutationOptions,
  type ApplyToPositionVariables,
} from './hooks';

export type {
  SeniorityLevel,
  PrimaryRole,
  SuggestedCandidate,
  CreatePositionInput,
  CreateProjectInput,
  ApplyToPositionInput,
} from './types';
