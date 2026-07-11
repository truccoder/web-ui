'use client';

import { useState } from 'react';
import { MoreHorizontal, Heart, MessageCircle, Share2, MapPin, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useT } from '@/lib/i18n';
import { useProfile } from '@/lib/hooks/use-user';
import { useUpsertReaction, useRemoveReaction, useCreateComment } from '@/lib/hooks/use-posts';
import { getNeutralAvatarColor } from '@/lib/avatar-color';
import { cn } from '@/lib/utils';
import { EventPostDetails } from './event-post-details';
import { BookPostSummary } from './book-post-summary';
import type { FeedPostData, SessionComment } from '@/lib/types';

interface PostCardProps {
  post: FeedPostData;
}

function nameInitials(name: string): string {
  return (name ?? '')
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getLocationLabel(post: FeedPostData): string | null {
  const { locationType, locationDetails } = post;
  if (!locationType) return null;

  if (locationType === 'COORDINATE') {
    if (locationDetails?.latitude != null && locationDetails?.longitude != null) {
      return `${locationDetails.latitude.toFixed(4)}, ${locationDetails.longitude.toFixed(4)}`;
    }
    return 'Vị trí đã chia sẻ';
  }

  if (locationType === 'REGION') {
    return locationDetails?.city ?? locationDetails?.display_name ?? 'Khu vực';
  }

  return locationDetails?.display_name ?? 'Địa điểm';
}

export function PostCard({ post }: PostCardProps) {
  const t = useT();
  const {
    postId,
    authorFullName,
    authorProfilePictureUrl,
    authorJobTitle,
    content,
    createdAt,
    shareCount,
  } = post;
  const locationLabel = getLocationLabel(post);
  const initials = nameInitials(authorFullName);

  const { data: profile } = useProfile();
  const { mutate: upsertReaction, isPending: isReacting } = useUpsertReaction(postId);
  const { mutate: removeReaction } = useRemoveReaction(postId);
  const { mutate: createComment, isPending: isCommenting } = useCreateComment(postId);

  // Session-only optimistic state: the backend has no GET for the current user's existing
  // reaction or for a post's comment list, so neither can be restored on load.
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentDraft, setCommentDraft] = useState('');
  const [sessionComments, setSessionComments] = useState<SessionComment[]>([]);
  const commentCount = post.commentCount + sessionComments.length;

  const handleToggleLike = () => {
    if (isReacting) return;
    if (liked) {
      setLiked(false);
      setLikeCount((c) => c - 1);
      removeReaction();
    } else {
      setLiked(true);
      setLikeCount((c) => c + 1);
      upsertReaction('LIKE');
    }
  };

  const handleSubmitComment = () => {
    const trimmed = commentDraft.trim();
    if (!trimmed) return;

    createComment(
      { content: trimmed },
      {
        onSuccess: () => {
          setSessionComments((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              content: trimmed,
              authorFullName: profile?.fullname ?? 'You',
              authorProfilePictureUrl: profile?.profilePictureUrl ?? '',
              createdAt: new Date().toISOString(),
            },
          ]);
          setCommentDraft('');
        },
      }
    );
  };

  function formatRelativeTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffSec < 60) return t('post.justNow');
    if (diffMin < 60) return t('post.minutesAgo', { minutes: diffMin });
    if (diffHr < 24) return t('post.hoursAgo', { hours: diffHr });
    if (diffDay < 7) return t('post.daysAgo', { days: diffDay });

    return date.toLocaleDateString('vi-VN', {
      day: 'numeric',
      month: 'short',
      year: diffDay > 365 ? 'numeric' : undefined,
    });
  }

  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarImage src={authorProfilePictureUrl} />
              <AvatarFallback className="text-sm font-medium">{initials ?? '?'}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold leading-tight">{authorFullName}</p>
              {authorJobTitle && (
                <p className="text-xs text-muted-foreground leading-tight">{authorJobTitle}</p>
              )}
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span className="text-xs text-muted-foreground">
                  {formatRelativeTime(createdAt)}
                </span>
                {locationLabel && (
                  <>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span>{locationLabel}</span>
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            className="p-1 rounded-full hover:bg-accent transition-colors cursor-pointer text-muted-foreground shrink-0"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        {content.trim() && (
          <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap break-words">{content}</p>
        )}

        {post.postType === 'EVENT' && post.eventDetails && (
          <EventPostDetails event={post.eventDetails} />
        )}

        {post.postType === 'BOOK' && post.book && <BookPostSummary book={post.book} />}

        {/* Actions */}
        <div className="mt-3 pt-3 border-t flex items-center gap-1">
          <button
            type="button"
            onClick={handleToggleLike}
            disabled={isReacting}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer',
              liked
                ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
          >
            <Heart className={cn('h-4 w-4', liked && 'fill-current')} />
            {likeCount > 0 && <span>{likeCount}</span>}
            {t('post.like')}
          </button>
          <button
            type="button"
            onClick={() => setCommentsOpen((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
          >
            <MessageCircle className="h-4 w-4" />
            {commentCount > 0 && <span>{commentCount}</span>}
            {t('post.comment')}
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer ml-auto"
          >
            <Share2 className="h-4 w-4" />
            {shareCount > 0 && <span>{shareCount}</span>}
            {t('post.share')}
          </button>
        </div>

        {/* Comments */}
        {commentsOpen && (
          <div className="mt-3 pt-3 border-t space-y-3">
            {sessionComments.map((c) => (
              <div key={c.id} className="flex items-start gap-2">
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarImage src={c.authorProfilePictureUrl} />
                  <AvatarFallback
                    className={`${getNeutralAvatarColor(c.authorFullName)} text-white text-[10px] font-medium`}
                  >
                    {nameInitials(c.authorFullName) || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="bg-muted rounded-2xl px-3 py-1.5 text-xs max-w-[85%]">
                  <p className="font-medium leading-tight">{c.authorFullName}</p>
                  <p className="mt-0.5 whitespace-pre-wrap break-words">{c.content}</p>
                </div>
              </div>
            ))}

            {post.commentCount > 0 && sessionComments.length === 0 && (
              <p className="text-xs text-muted-foreground">{t('post.olderCommentsHidden')}</p>
            )}

            <div className="flex items-center gap-2">
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarImage src={profile?.profilePictureUrl} />
                <AvatarFallback
                  className={`${getNeutralAvatarColor(profile?.id ?? 'default')} text-white text-[10px] font-medium`}
                >
                  {nameInitials(profile?.fullname ?? '') || '?'}
                </AvatarFallback>
              </Avatar>
              <input
                value={commentDraft}
                onChange={(e) => setCommentDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmitComment();
                  }
                }}
                placeholder={t('post.commentPlaceholder')}
                className="flex-1 bg-muted rounded-full px-3 py-1.5 text-xs placeholder:text-muted-foreground focus:outline-none"
              />
              <Button
                size="sm"
                className="h-7 px-3 text-xs"
                disabled={isCommenting || !commentDraft.trim()}
                onClick={handleSubmitComment}
              >
                {isCommenting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t('post.send')}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
