'use client';

import { MoreHorizontal, Heart, MessageCircle, Share2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { LocationBadge } from './location-badge';
import type { Post } from '@/lib/types';

interface PostCardProps {
  post: Post;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'Vừa xong';
  if (diffMin < 60) return `${diffMin} phút trước`;
  if (diffHr < 24) return `${diffHr} giờ trước`;
  if (diffDay < 7) return `${diffDay} ngày trước`;

  return date.toLocaleDateString('vi-VN', {
    day: 'numeric',
    month: 'short',
    year: diffDay > 365 ? 'numeric' : undefined,
  });
}

export function PostCard({ post }: PostCardProps) {
  const { author, content, location, createdAt } = post;

  const initials = author.fullName
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarImage src={author.profilePictureUrl} />
              <AvatarFallback className="text-sm font-medium">{initials ?? '?'}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold leading-tight">{author.fullName}</p>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span className="text-xs text-muted-foreground">
                  {formatRelativeTime(createdAt)}
                </span>
                {location && (
                  <>
                    <span className="text-xs text-muted-foreground">·</span>
                    <LocationBadge location={location} />
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
        <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap break-words">{content}</p>

        {/* Actions */}
        <div className="mt-3 pt-3 border-t flex items-center gap-1">
          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
          >
            <Heart className="h-4 w-4" />
            Thích
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
          >
            <MessageCircle className="h-4 w-4" />
            Bình luận
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer ml-auto"
          >
            <Share2 className="h-4 w-4" />
            Chia sẻ
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
