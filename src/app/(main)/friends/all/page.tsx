'use client';

import { useEffect, useRef } from 'react';
import { Loader2, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useInfiniteFriends } from '@/lib/hooks/use-friendship';
import { useT } from '@/lib/i18n';
import { getNeutralAvatarColor } from '@/lib/avatar-color';

function FriendCardSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3">
      <Skeleton className="h-12 w-12 rounded-full shrink-0" />
      <div className="space-y-1.5 flex-1">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}

export default function AllFriendsPage() {
  const t = useT();
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteFriends();

  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const friends = data?.pages.flatMap((page) => page.friends) ?? [];
  const totalCount = data?.pages[0]?.totalCount ?? 0;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('friends.all.title')}</h1>
        {!isLoading && friends.length > 0 && (
          <p className="text-muted-foreground mt-1">
            {t('friends.all.subtitle', { count: totalCount })}
          </p>
        )}
      </div>

      {isLoading ? (
        <div className="rounded-xl border divide-y overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <FriendCardSkeleton key={i} />
          ))}
        </div>
      ) : friends.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg">{t('friends.all.empty.title')}</h3>
          <p className="text-muted-foreground text-sm mt-1 max-w-xs">
            {t('friends.all.empty.desc')}
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-xl border divide-y overflow-hidden">
            {friends.map((friend) => {
              const color = getNeutralAvatarColor(friend.id);
              return (
                <div key={friend.id} className="flex items-center gap-3 p-3">
                  <Avatar className="h-12 w-12 shrink-0">
                    <AvatarImage src={friend.profilePictureUrl} />
                    <AvatarFallback className={`${color} text-white font-medium`}>
                      {friend.fullname?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <p className="font-medium text-sm truncate">{friend.fullname}</p>
                </div>
              );
            })}
          </div>

          <div ref={sentinelRef} />

          {isFetchingNextPage && (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!hasNextPage && (
            <p className="text-center text-xs text-muted-foreground py-4">
              {t('friends.all.allLoaded')}
            </p>
          )}
        </>
      )}
    </div>
  );
}
