'use client';

import { useState } from 'react';
import { Loader2, RefreshCw, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PaginationControls } from './pagination-controls';
import { useBannedUsers } from '@/lib/hooks/use-moderation';
import { useT } from '@/lib/i18n';

function formatRemaining(seconds: number): string {
  if (seconds <= 0) return '0m';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

interface BannedUsersTabProps {
  onViewPost: (postId: number) => void;
}

export function BannedUsersTab({ onViewPost }: BannedUsersTabProps) {
  const t = useT();
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, isFetching, refetch } = useBannedUsers(page, 10);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-sm text-muted-foreground">{t('admin.moderation.error')}</p>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          {t('admin.moderation.retry')}
        </Button>
      </div>
    );
  }

  if (!data || data.content.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-16">
        {t('admin.moderation.noBannedUsers')}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {data.content.map((user) => (
          <Card key={user.userId} className="shadow-sm">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <p className="text-sm font-semibold">{user.fullName}</p>
                  <p className="text-xs text-muted-foreground">
                    {user.email} · userId: {user.userId}
                  </p>
                </div>
                {user.currentlyBanned ? (
                  <Badge variant="destructive" className="gap-1">
                    <ShieldAlert className="h-3 w-3" />
                    {t('admin.moderation.banned', {
                      remaining: formatRemaining(user.remainingSeconds),
                    })}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1">
                    <ShieldCheck className="h-3 w-3" />
                    {t('admin.moderation.notBanned')}
                  </Badge>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                {t('admin.moderation.banCount', { count: user.banCount })}
              </p>

              {user.triggeringPostIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-xs text-muted-foreground">
                    {t('admin.moderation.triggeringPosts')}:
                  </span>
                  {user.triggeringPostIds.map((postId) => (
                    <button
                      key={postId}
                      type="button"
                      onClick={() => onViewPost(postId)}
                      className="text-xs rounded-full px-2 py-0.5 bg-muted hover:bg-accent transition-colors cursor-pointer"
                    >
                      #{postId}
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      <PaginationControls
        page={page}
        totalPages={data.totalPages}
        onPageChange={setPage}
        isFetching={isFetching}
      />
    </div>
  );
}
