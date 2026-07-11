'use client';

import { useState } from 'react';
import { Check, X, Loader2, ChevronDown, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ModerationFilters } from './moderation-filters';
import { PaginationControls } from './pagination-controls';
import { useModerationPosts, useReviewPost } from '@/lib/hooks/use-moderation';
import { useT } from '@/lib/i18n';
import type { ModerationStatus, ModerationLog, PostModerationDetail } from '@/lib/types';

const DEFAULT_FEEDBACK = 'Gemini free tier out of quota';

function HistoryTimeline({ history }: { history: ModerationLog[] }) {
  const t = useT();

  if (history.length === 0) {
    return <p className="text-xs text-muted-foreground">{t('admin.moderation.noHistory')}</p>;
  }

  return (
    <ol className="space-y-2 border-l pl-3">
      {history.map((log) => (
        <li key={log.id} className="text-xs">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{log.status}</Badge>
            {log.violationType && <span className="text-destructive">{log.violationType}</span>}
            <span className="text-muted-foreground">
              {new Date(log.reviewedAt ?? log.createdAt).toLocaleString()}
            </span>
          </div>
          {(log.textToxicityScore != null || log.imageSafeScore != null) && (
            <p className="text-muted-foreground mt-0.5">
              {log.textToxicityScore != null &&
                `${t('admin.moderation.toxicity')}: ${Math.round(log.textToxicityScore * 100)}%`}
              {log.textToxicityScore != null && log.imageSafeScore != null && ' · '}
              {log.imageSafeScore != null &&
                `${t('admin.moderation.imageSafeScore')}: ${Math.round(log.imageSafeScore * 100)}%`}
            </p>
          )}
          {log.ruleViolations && log.ruleViolations.length > 0 && (
            <p className="text-muted-foreground mt-0.5">{log.ruleViolations.join(', ')}</p>
          )}
        </li>
      ))}
    </ol>
  );
}

function PostCard({ post }: { post: PostModerationDetail }) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);
  const [feedback, setFeedback] = useState(DEFAULT_FEEDBACK);
  const { mutate: reviewPost, isPending } = useReviewPost();

  const canReview = post.currentStatus === 'PENDING_REVIEW';

  const handleDecision = (approve: boolean) => {
    reviewPost({
      postId: post.postId,
      payload: {
        decision: approve ? 'VERY_UNLIKELY' : 'VERY_LIKELY',
        feedback: feedback.trim() || undefined,
      },
    });
  };

  return (
    <Card className="shadow-sm">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold">
              {post.authorName}{' '}
              <span className="text-xs font-normal text-muted-foreground">
                (userId: {post.authorId})
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              #{post.postId} · {new Date(post.createdAt).toLocaleString()}
            </p>
          </div>
          <Badge variant="outline">{post.currentStatus}</Badge>
        </div>

        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{post.content}</p>

        {post.images && post.images.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {post.images.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={url}
                alt=""
                className="rounded-lg object-cover aspect-square w-full border"
              />
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
          {t('admin.moderation.viewHistory', { count: post.history.length })}
        </button>

        {expanded && <HistoryTimeline history={post.history} />}

        {canReview && (
          <div className="space-y-2 pt-1 border-t">
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder={t('admin.moderation.feedbackPlaceholder')}
              rows={2}
              className="w-full resize-none rounded-lg border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none"
            />
            <div className="flex items-center gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() => handleDecision(false)}
                className="gap-1.5 text-destructive hover:text-destructive"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4" />
                )}
                {t('admin.moderation.reject')}
              </Button>
              <Button
                size="sm"
                disabled={isPending}
                onClick={() => handleDecision(true)}
                className="gap-1.5"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                {t('admin.moderation.approve')}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface PostsTabProps {
  jumpToPostId?: number;
}

export function PostsTab({ jumpToPostId }: PostsTabProps) {
  const t = useT();
  const [postId, setPostId] = useState('');
  const [userId, setUserId] = useState('');
  const [status, setStatus] = useState<ModerationStatus | ''>('');
  const [page, setPage] = useState(1);
  const [lastSeenJump, setLastSeenJump] = useState(jumpToPostId);

  // Sync from the external "jump to this post" signal during render (not an effect) so a
  // second jump to the same postId doesn't get lost if the parent never resets it to undefined.
  if (jumpToPostId !== lastSeenJump) {
    setLastSeenJump(jumpToPostId);
    if (jumpToPostId !== undefined) {
      setPostId(String(jumpToPostId));
      setPage(1);
    }
  }

  const { data, isLoading, isError, isFetching, refetch } = useModerationPosts({
    postId: postId ? Number(postId) : undefined,
    userId: userId ? Number(userId) : undefined,
    status: status || undefined,
    page,
    size: 10,
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
          {t('admin.moderation.empty.title')}
        </p>
      ) : (
        <>
          <div className="space-y-4">
            {data.content.map((post) => (
              <PostCard key={post.postId} post={post} />
            ))}
          </div>
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
