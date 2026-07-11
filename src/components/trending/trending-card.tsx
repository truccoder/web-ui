'use client';

import { ArrowUpRight, Flame } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useT } from '@/lib/i18n';
import type { TrendingItem } from '@/lib/types';

interface TrendingCardProps {
  item: TrendingItem;
}

export function TrendingCard({ item }: TrendingCardProps) {
  const t = useT();
  const { title, summary, url, source, category, tags, score, author, publishedAt } = item;

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
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline">{t(`trending.sources.${source}`)}</Badge>
            <Badge variant="secondary">{t(`trending.categories.${category}`)}</Badge>
          </div>
          <div className="flex items-center gap-1 text-xs font-medium text-orange-500 shrink-0">
            <Flame className="h-3.5 w-3.5" />
            {score}
          </div>
        </div>

        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 flex items-start gap-1 group"
        >
          <h3 className="text-sm font-semibold leading-snug group-hover:underline">{title}</h3>
          <ArrowUpRight className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground" />
        </a>

        {summary && (
          <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed line-clamp-3">
            {summary}
          </p>
        )}

        {tags && tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-[10px]">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        <div className="mt-3 pt-3 border-t flex items-center gap-1.5 text-xs text-muted-foreground">
          {author && <span className="font-medium">{author}</span>}
          {author && <span>·</span>}
          <span>{formatRelativeTime(publishedAt)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
