'use client';

import { useState } from 'react';
import { ArrowUpRight, Flame } from 'lucide-react';
import { Badge, Card } from '@/shared/components';
import { useT } from '@/core/i18n';
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
 * IT HAS A PICTURE NOW, AND THE PICTURE IS THE WHOLE POINT OF THIS SURFACE. `TrendingItemDto`
 * carried title, summary, tags and url and **no image field at all** — filed as B17, on the
 * argument that a crawled item is the one thing in this product whose content nobody here wrote,
 * so it has no author, no avatar and no reputation chip to tell one card from the next. A column
 * of them was a column of grey paragraphs. The column `image_url` had existed since `V12` and
 * nothing had ever written to it; the backend fills it now — two of the three sources already
 * return an image in the JSON being fetched, and Hacker News is read off the destination page.
 *
 * A 64px THUMBNAIL ON THE LEADING EDGE, NOT A BANNER ACROSS THE TOP. The note below on the
 * missing rule says these cards are told apart from posts by STRUCTURE and by height — "two to
 * three lines against a post's six to twelve". A full-bleed image would erase exactly that and
 * make a crawled item the tallest thing in a mixed column. The leading thumbnail is what
 * `link-body.tsx` already does for the same object (someone else's link, with a picture), at the
 * same size, so the two agree without either having to know about the other.
 *
 * THE TAGS ROW IS CONDITIONAL, AND STAYS CONDITIONAL. `tags` was excluded from this feature's
 * type until F-B because the crawl scheduler never wrote it; it does now, but only 97 of 310 rows
 * carry any (census in `types/trending.ts`). So the row renders when there is something in it and
 * is absent otherwise — an empty tag strip on two cards out of three would read as a loading state
 * that never resolves.
 */
export interface TrendingCardProps {
  item: TrendingItem;
  className?: string;
}

export function TrendingCard({ item, className }: TrendingCardProps) {
  const t = useT();
  const relativeTime = useRelativeTime();

  // One flag rather than a set, unlike `PostImages`: a card has at most one picture, so a dead
  // URL can only take its own tile with it.
  const [thumbFailed, setThumbFailed] = useState(false);
  const showThumb = Boolean(item.imageUrl?.trim()) && !thumbFailed;

  // One appearance in both homes — the `/trending` list and the feed interleave. A `variant`
  // prop briefly made the list version fill-less; the kit fills both.
  return (
    <Card className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {item.source && <Badge variant="neutral">{t(`trending.sources.${item.source}`)}</Badge>}
          {/* `OTHER` IS SUPPRESSED, and it is the common case rather than an edge one. The crawl
              classifies with Gemini and falls back to `OTHER` whenever nothing else fits, so a
              feed of crawled items rendered `Hacker News · Khác` on every single card — a badge
              whose value never varies carries no information while still costing a row of the
              reader's attention. The other eight categories do vary, so they stay. */}
          {item.category && item.category !== 'OTHER' && (
            <Badge variant="accent">{t(`trending.categories.${item.category}`)}</Badge>
          )}
        </div>

        {/* Score means something different per source — Hacker News points, GitHub stars — so it
            is shown as a bare number with a flame rather than labelled as any one of them. */}
        {item.score !== null && (
          // `text-nx-text-muted`, NOT `text-nx-rep`. Constitution rule 1: amber belongs to
          // Elite Score, levels and verified skills, and nothing else. This is a crawled
          // item's upvote count on someone else's site — dressing it in the reputation
          // colour tells the reader a Hacker News score is reputation in this product, and
          // on the feed it rendered LOUDER than the real Elite Score chip beside it. A count
          // is apparatus; the flame already says what kind of number it is.
          <span className="flex shrink-0 items-center gap-1 text-nx-caption font-medium text-nx-text-muted">
            <Flame className="size-3.5" />
            {item.score.toLocaleString('vi-VN')}
          </span>
        )}
      </div>

      <div className="flex items-start gap-3">
        {/* A HOST WE DO NOT CONTROL, so the same three rules `link-body.tsx` applies: plain
            `<img>` because `next/image` would need every crawled domain declared and would 500 on
            the first one that is not; `onError` because a crawled URL rots and a broken frame is
            worse than no frame; `alt=""` because the title beside it already says what this is,
            and a crawler has no alt text to offer. */}
        {showThumb && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl ?? undefined}
            alt=""
            loading="lazy"
            onError={() => setThumbFailed(true)}
            className="size-16 shrink-0 rounded-nx-xs border border-nx-border-subtle object-cover"
          />
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-2">
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
        </div>
      </div>

      {/* Gemini's own words, not a controlled vocabulary — there is no tag filter to link these
          to, and inventing one would promise a query the backend cannot answer. So they are
          labels, not controls. */}
      {item.tags && item.tags.length > 0 && (
        <ul className="flex flex-wrap gap-1">
          {item.tags.map((tag) => (
            <li key={tag}>
              <Badge variant="neutral">{tag}</Badge>
            </li>
          ))}
        </ul>
      )}

      {/**
       * NO RULE HERE, AND THAT IS WHAT TELLS THE TWO CARD KINDS APART.
       *
       * This row used to sit under a `border-subtle` hairline, mirroring `PostCard`'s footer. The
       * round-15 spec for `ExternalCard` is explicit that it has **two groups, no rule and no
       * reaction strip**, and the reasoning is structural rather than decorative: a post's rule is
       * a hinge dividing what was said from what you can do about it. A crawled item has no acting
       * half — you cannot react to it, comment on it or answer it — so there is nothing for a rule
       * to divide, and drawing one anyway claims a symmetry that is not there.
       *
       * The two kinds sit in one column on the `Tất cả` tab and are told apart by STRUCTURE, never
       * by a border, a tint or a label. This absence is half of that structure; the other half is
       * height — two to three lines against a post's six to twelve.
       */}
      <div className="flex items-center gap-2 text-nx-caption text-nx-text-muted">
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
