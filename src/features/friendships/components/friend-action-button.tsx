'use client';

import { Check, UserCheck, UserPlus } from 'lucide-react';
import { Button } from '@/shared/components';
import { cn } from '@/shared/lib/cn';
import { getErrorMessage } from '@/shared/lib/api-error';
import { useT } from '@/core/i18n';
import {
  useAcceptFriendRequest,
  useFriends,
  usePendingRequests,
  useRejectFriendRequest,
  useSendFriendRequest,
  useSentRequests,
} from '../hooks/use-friendship';

/**
 * The friend control for a surface that is about one person — `/u/{username}`. `blocks` and
 * `chat` both got a one-person button when their backend calls opened up; this is the third,
 * and the reason it did not exist alongside the other two is that nothing here derives the
 * relationship from a single call — `FriendshipController` has no `GET .../{userId}` answering
 * "what am I to this person", so the four states below are read off the three lists every other
 * friends screen already fetches (`useFriends`, `usePendingRequests`, `useSentRequests`).
 *
 * `useFriends()` CHECKS ONLY THE FIRST 50. Same ceiling `usePendingRequests` accepts deliberately
 * (see its own note) — a visitor with a 51st friend the viewer happens to be would see "Kết bạn"
 * offered again rather than "Bạn bè". `sendRequest` on an existing friendship is a 400 the button
 * would surface like any other failed send, not a broken state.
 */
export interface FriendActionButtonProps {
  userId: number;
  className?: string;
}

export function FriendActionButton({ userId, className }: FriendActionButtonProps) {
  const t = useT();

  const { data: friends, isLoading: loadingFriends } = useFriends();
  const { data: pending, isLoading: loadingPending } = usePendingRequests();
  const { data: sent, isLoading: loadingSent } = useSentRequests();

  const send = useSendFriendRequest();
  const accept = useAcceptFriendRequest();
  const reject = useRejectFriendRequest();

  if (loadingFriends || loadingPending || loadingSent) {
    return (
      <Button size="sm" variant="secondary" className={className} disabled loading>
        {t('friends.suggestions.addFriend')}
      </Button>
    );
  }

  const isFriend = friends?.friends.some((friend) => friend.userId === userId) ?? false;
  // An incoming request from this exact person — offered inline rather than sending the viewer to
  // `/friends/requests` for a decision about the one person they are already looking at.
  const incoming = pending?.find((request) => request.requesterId === userId);
  const outgoing = sent?.find((request) => request.addresseeId === userId);

  if (isFriend) {
    return (
      <Button size="sm" variant="secondary" icon={<UserCheck />} disabled className={className}>
        {t('friends.title')}
      </Button>
    );
  }

  if (incoming) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Button
          size="sm"
          icon={<Check />}
          loading={accept.isPending}
          disabled={reject.isPending}
          onClick={() => accept.mutate(incoming.id)}
        >
          {t('friends.requests.confirm')}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          loading={reject.isPending}
          disabled={accept.isPending}
          onClick={() => reject.mutate(incoming.id)}
        >
          {t('friends.requests.delete')}
        </Button>
      </div>
    );
  }

  if (outgoing) {
    return (
      <Button size="sm" variant="secondary" disabled className={className}>
        {t('friends.suggestions.requestSent')}
      </Button>
    );
  }

  return (
    <div className={className}>
      <Button
        size="sm"
        variant="secondary"
        icon={<UserPlus />}
        loading={send.isPending}
        onClick={() => send.mutate(userId)}
      >
        {t('friends.suggestions.addFriend')}
      </Button>

      {send.isError && (
        <p role="alert" className="mt-1 text-nx-caption text-nx-status-danger-fg">
          {getErrorMessage(send.error, t('friends.action.sendError'))}
        </p>
      )}
    </div>
  );
}
