'use client';

import { ArrowUpRight, Flame } from 'lucide-react';
import { Badge, Card } from '@/shared/components';
import { useT } from '@/lib/i18n';
import { useRelativeTime } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';
import type { TrendingItem } from '../types/trending';

/**
 * One crawled item.
 *
 * THE WHOLE CARD IS A LINK OFF-SITE, and that is the only thing it can be: the app stores a title,
 * a summary and a URL, and has no reader view for someone else's article. So the affordance is
 * stated plainly — `target="_blank"` with the outward arrow — instead of a card that looks
 * navigable in-app and is not.
 *
 * NO TAGS ROW. The DTO carries `tags`, but nothing ever writes them (see `types/trending.ts`), so
 * the field is not in this feature's type and there is nothing here to render. The legacy card had
 * a conditional tags row that could not appear on any of the 110 rows in the table.
 */
export interface TrendingCardProps {
  item: TrendingItem;
  className?: string;
}

export function TrendingCard({ item, className }: TrendingCardProps) {
  const t = useT();
  const relativeTime = useRelativeTime();

  return (
    <Card className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {item.source && <Badge variant="neutral">{t(`trending.sources.${item.source}`)}</Badge>}
          {item.category && (
            <Badge variant="accent">{t(`trending.categories.${item.category}`)}</Badge>
          )}
        </div>

        {/* Score means something different per source — Hacker News points, GitHub stars — so it
            is shown as a bare number with a flame rather than labelled as any one of them. */}
        {item.score !== null && (
          <span className="flex shrink-0 items-center gap-1 text-nx-caption font-medium text-nx-rep">
            <Flame className="size-3.5" />
            {item.score.toLocaleString('vi-VN')}
          </span>
        )}
      </div>

      {item.url ? (
        <a
          href={item.url}
          target="_blank"
          // `noopener` is the security part (the opened page cannot reach back through
          // `window.opener`); `noreferrer` keeps this app's URLs out of the destination's logs.
          rel="noopener noreferrer"
          className={cn(
            'group flex items-start gap-1',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring'
          )}
        >
          <h3 className="text-nx-ui font-semibold text-nx-text-primary group-hover:underline">
            {item.title ?? t('trending.untitled')}
          </h3>
          <ArrowUpRight className="mt-0.5 size-3.5 shrink-0 text-nx-text-muted" aria-hidden />
        </a>
      ) : (
        <h3 className="text-nx-ui font-semibold text-nx-text-primary">
          {item.title ?? t('trending.untitled')}
        </h3>
      )}

      {/* Null on 46 of 110 rows — GitHub repositories have no abstract to crawl. */}
      {item.summary && (
        <p className="line-clamp-3 text-nx-body-sm leading-relaxed text-nx-text-secondary">
          {item.summary}
        </p>
      )}

      <div className="mt-1 flex items-center gap-1.5 border-t border-nx-border-subtle pt-2.5 text-nx-caption text-nx-text-muted">
        {item.author && (
          <>
            <span className="font-medium">{item.author}</span>
            <span aria-hidden>·</span>
          </>
        )}
        {/* `publishedAt` is an `OffsetDateTime` here and arrives with a `Z`, so the shared formatter
            reads it correctly — unlike `features/search`, whose DTO sends a zoneless timestamp and
            needs a workaround. Nothing to compensate for on this endpoint. */}
        {item.publishedAt && <span>{relativeTime(item.publishedAt)}</span>}
      </div>
    </Card>
  );
}
