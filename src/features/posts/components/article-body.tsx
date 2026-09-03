import { cn } from '@/shared/lib/cn';
import type { ArticleDetails } from '../types/post';

/**
 * Read side of an `ARTICLE` post — fills `PostCard`'s `header` slot with the title and summary.
 *
 * `coverImage` IS NOT RENDERED HERE. A full-width picture at the top of every article card was
 * noise in a scrolling column — the title and the teaser are what a reader scans, and the image
 * competed with them. The value is still collected by the composer and still stored, but its only
 * job now is the link-unfurl card: `posts/[id]/layout.tsx` puts it in the Open Graph tags, so a
 * post pasted into Slack, Facebook or a chat shows the cover, the title and the summary while the
 * in-app card stays text. This is a deliberate split, not debt.
 *
 * No `'use client'` and no state any more: with the `<img>` gone there is no `onError` to catch,
 * so this is a plain server-renderable component that prints two paragraphs.
 */
export interface ArticleBodyProps {
  details: ArticleDetails;
  className?: string;
}

export function ArticleBody({ details, className }: ArticleBodyProps) {
  const { title, summary } = details;

  const hasTitle = Boolean(title?.trim());
  const hasSummary = Boolean(summary?.trim());

  // Nothing was filled in — the backend does not validate ARTICLE blocks, so this happens.
  if (!hasTitle && !hasSummary) return null;

  return (
    <div className={cn('flex flex-col gap-[var(--nx-space-element)]', className)}>
      {hasTitle && (
        // Heading level is deliberately not <h2>: a card sits inside a feed whose own
        // heading structure is the page's, and a per-post heading would make the outline
        // nonsense. Weight and size carry the hierarchy instead.
        <p className="text-nx-heading font-semibold text-nx-text-primary">{title}</p>
      )}

      {hasSummary && (
        // `max-w-[68ch]` is the kit's reading measure for post bodies. Without it the
        // summary ran the full 672 canvas, which is roughly 88 characters at 15px — past
        // the line length where the eye reliably finds the next line.
        <p className="max-w-[68ch] whitespace-pre-wrap break-words text-nx-body-sm text-nx-text-secondary">
          {summary}
        </p>
      )}
    </div>
  );
}
