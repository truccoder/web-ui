import api from '@/core/api/axios';
import type { BlockedUser } from '../types/block';

/**
 * BlockController (`com.socialapp.blocks`) — 3 endpoints, one function each. Bare-DTO responses.
 *
 * BOTH WRITES RETURN 204 AND ARE IDEMPOTENT. Blocking someone already blocked is a 204, not a
 * conflict — the caller asked for a state that is already true. So nothing here needs to check
 * first, and the UI never has to explain a failure that is really a no-op.
 */
export const blockApi = {
  /** GET /v1/api/blocks — everyone the caller has blocked. */
  getBlockedUsers: () => api.get<BlockedUser[]>('/v1/api/blocks').then((r) => r.data),

  /** POST /v1/api/blocks/{userId} — 204. */
  block: (userId: number) => api.post<void>(`/v1/api/blocks/${userId}`).then((r) => r.data),

  /** DELETE /v1/api/blocks/{userId} — 204. */
  unblock: (userId: number) => api.delete<void>(`/v1/api/blocks/${userId}`).then((r) => r.data),
};
