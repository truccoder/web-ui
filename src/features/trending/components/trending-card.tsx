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
 * A WIDE PICTURE UNDER THE TEXT, AND IT WAS A 64px THUMBNAIL ON THE LEADING EDGE UNTIL THE OWNER
 * CALLED IT. The note that stood here defended the thumbnail on the ground that a crawled card is
 * told apart from a post by STRUCTURE and by height — "two to three lines against a post's six to
 * twelve" — so a banner would erase the difference and make a crawled item the tallest thing in a
 * mixed column. The height objection was real and is now paid on purpose: the ask was the Facebook
 * shape, text first and then the picture at the full measure, and a 64px square of a 1200-wide
 * article image is a picture nobody can actually see.
 *
 * WHAT STILL TELLS THE TWO KINDS APART, now that height does not: the source badge and the flame
 * score above the title, the outward arrow on the title itself, the tag row, and the absence of
 * any acting strip at all (see the note on the missing rule below). None of those is on a post.
 *
 * `aspect-[1.91/1] object-cover` — THE RATIO IS THE CRAWL'S OWN. Open Graph images are authored at
 * 1200x630 and GitHub's at 1200x600, so this is the frame they were cut for; letting each image
 * keep its own proportions would ripple down the column as every source's habit changed.
 * `PostImages` does the opposite for a single post image — `max-h-[28rem] object-contain` — and
 * the difference is deliberate: cropping the one picture an author chose destroys what they
 * posted, while cropping an OG banner crops a banner.
 *
 * IT STAYS INSIDE THE CARD'S PADDING rather than bleeding to the card's edge. Facebook's preview
 * does bleed; nothing in this product does, a post's own images included, and one card breaking
 * the column would read as a mistake rather than as emphasis.
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

/**
 * The picture's frame, named because the card draws it twice — inside a link when the item has a
 * URL to open, bare when it does not.
 *
 * The sunken fill is what a slow or transparent image sits on, so the frame is the same height
 * before and after it loads and the column does not jump.
 */
const THUMB = cn(
  'aspect-[1.91/1] w-full rounded-nx-sm border border-nx-border-subtle object-cover',
  'bg-nx-surface-sunken'
);

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

      <div className="flex min-w-0 flex-col gap-1">
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

        {/**
         * ONE LINE, DOWN FROM THREE, AND THE CLAMP IS THE WHOLE DIFFERENCE. The ask was a summary
         * line under every title, which is what this already rendered — at up to three lines,
         * which on a card that now carries a picture as well would stack the two most variable
         * things in the column and let a card run to any height it liked. One line is a fixed
         * cost, so every card keeps the same skeleton: title, a line about it, the picture.
         *
         * IT IS ABSENT, NOT EMPTY, WHEN THERE IS NOTHING TO SAY. `summary` is null on a large
         * share of rows — GitHub repositories have no abstract to crawl, and Hacker News items
         * frequently arrive without one (checked live against `GET /v1/api/trending`: 2 of the
         * first 5 rows null). A blank line held open for them would read as a failed load.
         */}
        {item.summary && (
          <p className="line-clamp-1 text-nx-body-sm leading-relaxed text-nx-text-secondary">
            {item.summary}
          </p>
        )}
      </div>

      {/**
       * A HOST WE DO NOT CONTROL, so the same three rules `link-body.tsx` applies: plain `<img>`
       * because `next/image` would need every crawled domain declared and would 500 on the first
       * one that is not; `onError` because a crawled URL rots and a broken frame is worse than no
       * frame; `alt=""` because the title above it already says what this is, and a crawler has no
       * alt text to offer.
       *
       * THE PICTURE IS A SECOND WAY TO THE SAME ARTICLE, and `aria-hidden` + `tabIndex={-1}` are
       * what keep that from costing anything: an anchor whose only content is an empty-alt image
       * has no accessible name, so leaving it in the tree would announce a nameless link and add a
       * second tab stop to a destination the title already offers. A mouse gets what it expects;
       * a screen reader and the keyboard get one link per card.
       */}
      {showThumb &&
        (item.url ? (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-hidden
            tabIndex={-1}
            className="block"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.imageUrl ?? undefined}
              alt=""
              loading="lazy"
              onError={() => setThumbFailed(true)}
              className={THUMB}
            />
          </a>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl ?? undefined}
            alt=""
            loading="lazy"
            onError={() => setThumbFailed(true)}
            className={THUMB}
          />
        ))}

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
       * This card and `PostCard` are told apart by STRUCTURE, never by a border, a tint or a label
       * — the distinction that mattered while the two shared one column, and still the reason the
       * shapes stay this far apart now that `Công nghệ` and `Bài viết` are separate tabs. This
       * absence is half of that structure; the other half is height — two to three lines against a
       * post's six to twelve.
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
