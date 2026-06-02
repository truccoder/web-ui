'use client';

import { useState } from 'react';
import { UserCheck, Clock } from 'lucide-react';
import {
  usePendingRequests,
  useSentRequests,
  useAcceptFriendRequest,
  useRejectFriendRequest,
  useCancelFriendRequest,
} from '@/lib/hooks/use-friendship';
import { useT } from '@/lib/i18n';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

function RequestSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl">
      <Skeleton className="h-14 w-14 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-3 w-24" />
        <div className="flex gap-2 mt-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <UserCheck className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-base">{title}</h3>
      <p className="text-muted-foreground text-sm mt-1 max-w-xs">{description}</p>
    </div>
  );
}

export default function FriendRequestsPage() {
  const [tab, setTab] = useState<'received' | 'sent'>('received');
  const t = useT();

  const { data: pendingRequests, isLoading: loadingPending } = usePendingRequests();
  const { data: sentRequests, isLoading: loadingSent } = useSentRequests();

  const { mutate: acceptRequest, isPending: isAccepting } = useAcceptFriendRequest();
  const { mutate: rejectRequest, isPending: isRejecting } = useRejectFriendRequest();
  const { mutate: cancelRequest, isPending: isCancelling } = useCancelFriendRequest();

  const pendingCount = pendingRequests?.length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('friends.requests.title')}</h1>
        <p className="text-muted-foreground mt-1">{t('friends.requests.subtitle')}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        <button
          onClick={() => setTab('received')}
          className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
            tab === 'received'
              ? 'text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {t('friends.requests.tabReceived')}
          {pendingCount > 0 && (
            <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[10px]">
              {pendingCount}
            </Badge>
          )}
        </button>
        <button
          onClick={() => setTab('sent')}
          className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
            tab === 'sent'
              ? 'text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {t('friends.requests.tabSent')}
        </button>
      </div>

      {/* Received requests */}
      {tab === 'received' && (
        <div>
          {loadingPending ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <RequestSkeleton key={i} />
              ))}
            </div>
          ) : !pendingRequests || pendingRequests.length === 0 ? (
            <EmptyState
              title={t('friends.requests.receivedEmpty.title')}
              description={t('friends.requests.receivedEmpty.desc')}
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {pendingRequests.map((req) => (
                <div
                  key={req.id}
                  className="flex gap-3 p-3 rounded-xl border bg-card hover:bg-accent/30 transition-colors"
                >
                  <Avatar className="h-14 w-14 shrink-0">
                    <AvatarImage src={req.requesterProfilePictureUrl} />
                    <AvatarFallback className="text-lg font-semibold">
                      {req.requesterFullName?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{req.requesterFullName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(req.createdAt).toLocaleDateString('vi-VN', {
                        day: 'numeric',
                        month: 'long',
                      })}
                    </p>
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        className="flex-1 h-8"
                        disabled={isAccepting}
                        onClick={() => acceptRequest(req.id)}
                      >
                        {t('friends.requests.confirm')}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="flex-1 h-8"
                        disabled={isRejecting}
                        onClick={() => rejectRequest(req.id)}
                      >
                        {t('friends.requests.delete')}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sent requests */}
      {tab === 'sent' && (
        <div>
          {loadingSent ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <RequestSkeleton key={i} />
              ))}
            </div>
          ) : !sentRequests || sentRequests.length === 0 ? (
            <EmptyState
              title={t('friends.requests.sentEmpty.title')}
              description={t('friends.requests.sentEmpty.desc')}
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {sentRequests.map((req) => (
                <div
                  key={req.id}
                  className="flex gap-3 p-3 rounded-xl border bg-card hover:bg-accent/30 transition-colors"
                >
                  <Avatar className="h-14 w-14 shrink-0">
                    <AvatarImage src={req.addresseeProfilePictureUrl} />
                    <AvatarFallback className="text-lg font-semibold">
                      {req.addresseeFullName?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{req.addresseeFullName}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">
                        {t('friends.requests.awaiting')}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="mt-2 h-8 w-full"
                      disabled={isCancelling}
                      onClick={() => cancelRequest(req.id)}
                    >
                      {t('friends.requests.cancelRequest')}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
