'use client';

import { UserPlus } from 'lucide-react';
import { Button, Card, EmptyState, Skeleton } from '@/shared/components';
import { getErrorMessage } from '@/shared/lib/api-error';
import { useT } from '@/lib/i18n';
import {
  useFriendSuggestions,
  useSendFriendRequest,
  useSentRequests,
} from '../hooks/use-friendship';
import { FriendListItem } from './friend-list-item';

/**
 * The `/friends/suggestions` surface: people you may know
 * (`GET /v1/api/friendships/suggestions`, friend-of-friend ranked by mutual count), each
 * with a send-request action.
 *
 * Sending invalidates the suggestions list, so an added person normally disappears on
 * refetch; the `sent` cross-check still matters for anyone requested in an earlier
 * session, who would otherwise reappear here with a live-looking button.
 *
 * Row actions are `secondary`, not `primary`: `Button.prompt.md` allows exactly one
 * primary per view, and a repeated row action has no hierarchy to express (unlike
 * accept-vs-reject in `FriendRequests`, where the pair is the point).
 *
 * `limit` EXISTS FOR THE DASHBOARD WIDGET (P3.3), which shows a summary next to a link to this
 * component's own page. It trims the rendered rows only — the query is unchanged, because the
 * backend endpoint takes no size parameter and both callers share one cache entry.
 */

export interface FriendSuggestionsProps {
  /** Render at most this many rows. Undefined renders all of them. */
  limit?: number;
}

function SuggestionRowSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3">
      <Skeleton circle height={40} />
      <div className="flex flex-1 flex-col gap-1.5">
        <Skeleton width={150} height={14} />
        <Skeleton width={80} height={12} />
      </div>
      <Skeleton width={112} height={28} radius="var(--radius-nx-sm)" />
    </div>
  );
}

export function FriendSuggestions({ limit }: FriendSuggestionsProps = {}) {
  const t = useT();
  const { data: suggestions, isLoading } = useFriendSuggestions();
  const { data: sent } = useSentRequests();
  const send = useSendFriendRequest();

  if (isLoading) {
    return (
      <Card padding={0} className="divide-y divide-nx-border-subtle overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <SuggestionRowSkeleton key={i} />
        ))}
      </Card>
    );
  }

  if (!suggestions || suggestions.length === 0) {
    return (
      <EmptyState
        title={t('friends.suggestions.empty.title')}
        description={t('friends.suggestions.empty.desc')}
      />
    );
  }

  const sentIds = new Set(sent?.map((request) => request.addresseeId) ?? []);

  return (
    <div className="space-y-3">
      {send.isError && (
        <p
          role="alert"
          className="rounded-nx-sm bg-nx-status-danger-bg px-3 py-2 text-nx-body-sm text-nx-status-danger-fg"
        >
          {getErrorMessage(send.error)}
        </p>
      )}

      <Card padding={0} className="divide-y divide-nx-border-subtle overflow-hidden">
        {(limit === undefined ? suggestions : suggestions.slice(0, limit)).map(
          ({ profile, mutualFriends }) => {
            const alreadySent = sentIds.has(profile.userId);
            return (
              <div key={profile.userId} className="p-3">
                <FriendListItem
                  name={profile.fullName}
                  avatarUrl={profile.profilePictureUrl}
                  subtitle={
                    mutualFriends > 0
                      ? t('friends.suggestions.mutualFriends', { count: mutualFriends })
                      : t('friends.suggestions.suggestedForYou')
                  }
                  actions={
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={<UserPlus />}
                      disabled={alreadySent}
                      loading={send.isPending && send.variables === profile.userId}
                      onClick={() => send.mutate(profile.userId)}
                    >
                      {alreadySent
                        ? t('friends.suggestions.requestSent')
                        : t('friends.suggestions.addFriend')}
                    </Button>
                  }
                />
              </div>
            );
          }
        )}
      </Card>
    </div>
  );
}
