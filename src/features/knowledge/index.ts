/**
 * `features/knowledge` — mirrors the backend package `com.socialapp.knowledge`
 * (ExplanationController 3 + KnowledgeSyncController 2 + PersonalAccessTokenController 3 +
 * ProfessionalProfileController 2 = 10 endpoints).
 *
 * TWO OF THOSE CONTROLLERS HAVE PATHS THAT LOOK LIKE SECURITY: `/v1/api/tokens` and
 * `/v1/api/profile/professional`. Both are in this backend package, and feature boundaries mirror
 * package boundaries 1:1 (CLAUDE.md §4), so both are here. Filtering the spec by path would put
 * them in the wrong domain — the ledger's boundary note exists to stop exactly that "fix".
 *
 * THE DOMAIN IS TWO HALVES SHARING A PACKAGE. One is an AI explainer over posts, steered by the
 * professional profile (`explanationStyle`, `knownTechStack`) and collected into a personal
 * library. The other is credential plumbing for an external Obsidian-vault client: this app mints
 * and revokes the tokens, and the vault client — not the browser — does the syncing.
 *
 * 8 API FUNCTIONS FOR 10 ENDPOINTS, ON PURPOSE. `/knowledge/sync/pull` and `/knowledge/sync/push`
 * authenticate with a personal access token and reject the session JWT outright (measured: 404
 * "Invalid token"). Reasoning in full on `explanationApi`.
 */

export { explanationApi, professionalProfileApi, tokenApi } from './api';

export {
  CreateTokenDialog,
  type CreateTokenDialogProps,
  ExplainPostAction,
  type ExplainPostActionProps,
  ExplanationCard,
  type ExplanationCardProps,
  KnowledgeLibrary,
  ProfessionalProfileForm,
  TokenList,
} from './components';

export {
  isProfileMissing,
  isProfileRequired,
  knowledgeKeys,
  useCreateToken,
  useExplainPost,
  useKnowledgeLibrary,
  usePersonalAccessTokens,
  useProfessionalProfile,
  useRevokeToken,
  useRoleLine,
  useSaveExplanation,
  useUpdateProfessionalProfile,
} from './hooks';

/* Beside its hook rather than in the type block below, because it is the hook's argument shape
   and not a domain concept — `./types` mirrors the backend DTOs. */
export type { RoleLineInput } from './hooks';

export type {
  CreatedToken,
  CreateTokenInput,
  Explanation,
  ExplanationStyle,
  ExternalLink,
  SavedExplanations,
  PersonalAccessToken,
  PrimaryRole,
  ProfessionalProfile,
  SaveExplanationInput,
  SeniorityLevel,
  UpdateProfessionalProfileInput,
  VaultPermission,
  WorkExperience,
} from './types';
