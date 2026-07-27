import api from '@/core/api/axios';
import type {
  Page,
  PostModerationDetail,
  ModerationLog,
  BannedUser,
  ModerationSearchParams,
  AdminReviewRequest,
} from '@/lib/types';

export const moderationApi = {
  searchPosts: (params: ModerationSearchParams) =>
    api.get<Page<PostModerationDetail>>('/v1/api/admin/moderation/posts', { params }),

  searchLogs: (params: ModerationSearchParams) =>
    api.get<Page<ModerationLog>>('/v1/api/admin/moderation/logs', { params }),

  getBannedUsers: (page = 1, size = 10) =>
    api.get<Page<BannedUser>>('/v1/api/admin/moderation/banned-users', {
      params: { page, size },
    }),

  reviewPost: (postId: number, payload: AdminReviewRequest) =>
    api.post<void>(`/v1/api/admin/moderation/posts/${postId}/review`, payload),
};
