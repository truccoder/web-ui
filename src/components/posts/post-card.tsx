'use client';

import { MoreHorizontal, Heart, MessageCircle, Share2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { useT } from '@/lib/i18n';
import type { FeedPostData } from '@/lib/types';

interface PostCardProps {
  post: FeedPostData;
}

export function PostCard({ post }: PostCardProps) {
  const t = useT();
  const { authorFullName, authorProfilePictureUrl, content, createdAt, likeCount, commentCount, shareCount } = post;

  const initials = authorFullName
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

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
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span className="text-xs text-muted-foreground">
                  {formatRelativeTime(createdAt)}
                </span>
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
        <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap break-words">{content}</p>

        {/* Actions */}
        <div className="mt-3 pt-3 border-t flex items-center gap-1">
          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
          >
            <Heart className="h-4 w-4" />
            {likeCount > 0 && <span>{likeCount}</span>}
            {t('post.like')}
          </button>
          <button
            type="button"
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
      </CardContent>
    </Card>
  );
}
