import api from '@/core/api/axios';
import type { Reputation } from '../types/reputation';

/**
 * ReputationController (`com.socialapp.reputation`) — 1 endpoint, one function.
 * Bare-DTO response (no wrapper). 404 when the user id does not exist.
 */
export const reputationApi = {
  /** GET /v1/api/users/{userId}/reputation — Elite Score, level and next-level threshold. */
  getReputation: (userId: number) =>
    api.get<Reputation>(`/v1/api/users/${userId}/reputation`).then((r) => r.data),
};
