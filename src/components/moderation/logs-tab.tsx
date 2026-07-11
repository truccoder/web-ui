'use client';

import { useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ModerationFilters } from './moderation-filters';
import { PaginationControls } from './pagination-controls';
import { useModerationLogs } from '@/lib/hooks/use-moderation';
import { useT } from '@/lib/i18n';
import type { ModerationStatus } from '@/lib/types';

export function LogsTab() {
  const t = useT();
  const [postId, setPostId] = useState('');
  const [userId, setUserId] = useState('');
  const [status, setStatus] = useState<ModerationStatus | ''>('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, isFetching, refetch } = useModerationLogs({
    postId: postId ? Number(postId) : undefined,
    userId: userId ? Number(userId) : undefined,
    status: status || undefined,
    page,
    size: 20,
  });

  const handleFilterChange = (setter: (v: string) => void) => (value: string) => {
    setter(value);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <ModerationFilters
        postId={postId}
        onPostIdChange={handleFilterChange(setPostId)}
        userId={userId}
        onUserIdChange={handleFilterChange(setUserId)}
        status={status}
        onStatusChange={(v) => {
          setStatus(v);
          setPage(1);
        }}
      />

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-sm text-muted-foreground">{t('admin.moderation.error')}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            {t('admin.moderation.retry')}
          </Button>
        </div>
      ) : !data || data.content.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-16">
          {t('admin.moderation.noLogs')}
        </p>
      ) : (
        <>
          <Card className="shadow-sm">
            <CardContent className="p-0 divide-y">
              {data.content.map((log) => (
                <div key={log.id} className="p-3 text-xs space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">#{log.postId}</span>
                    <Badge variant="outline">{log.status}</Badge>
                    {log.violationType && (
                      <span className="text-destructive">{log.violationType}</span>
                    )}
                    <span className="text-muted-foreground ml-auto">
                      {new Date(log.reviewedAt ?? log.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {(log.textToxicityScore != null || log.imageSafeScore != null) && (
                    <p className="text-muted-foreground">
                      {log.textToxicityScore != null &&
                        `${t('admin.moderation.toxicity')}: ${Math.round(log.textToxicityScore * 100)}%`}
                      {log.textToxicityScore != null && log.imageSafeScore != null && ' · '}
                      {log.imageSafeScore != null &&
                        `${t('admin.moderation.imageSafeScore')}: ${Math.round(log.imageSafeScore * 100)}%`}
                    </p>
                  )}
                  {log.ruleViolations && log.ruleViolations.length > 0 && (
                    <p className="text-muted-foreground">{log.ruleViolations.join(', ')}</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
          <PaginationControls
            page={page}
            totalPages={data.totalPages}
            onPageChange={setPage}
            isFetching={isFetching}
          />
        </>
      )}
    </div>
  );
}
