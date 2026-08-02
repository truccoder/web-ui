'use client';

import { useState } from 'react';
import { useT } from '@/core/i18n';
import { cn } from '@/shared/lib/cn';
import type { ArticleDetails } from '../types/post';

/**
 * Read side of an `ARTICLE` post — fills `PostCard`'s `body` slot.
 *
 * `coverImage` is a URL THE AUTHOR TYPED, not an upload. There is no shared image-upload
 * endpoint (`@RequestPart MultipartFile` appears in exactly three places: book file+cover,
 * registration avatar, `PUT /profile/picture`), so this points at some third-party host
 * that may 404, may hotlink-block, or may never have been a picture. It is therefore
 * treated as untrusted: a load failure hides the image instead of leaving a broken-image
 * glyph in the middle of the feed.
 */
export interface ArticleBodyProps {
  details: ArticleDetails;
  className?: string;
}

export function ArticleBody({ details, className }: ArticleBodyProps) {
  const t = useT();
  const [coverFailed, setCoverFailed] = useState(false);
  const { title, coverImage, summary } = details;

  const hasTitle = Boolean(title?.trim());
  const hasSummary = Boolean(summary?.trim());
  const showCover = Boolean(coverImage?.trim()) && !coverFailed;

  // Nothing was filled in — the backend does not validate ARTICLE blocks, so this happens.
  if (!hasTitle && !hasSummary && !showCover) return null;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {showCover && (
        // Runtime user-supplied URL from an arbitrary host: next/image would need a
        // remote-pattern allowlist that cannot be written for "anywhere", so a plain img.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={coverImage}
          alt={hasTitle ? (title as string) : t('post.body.coverAlt')}
          onError={() => setCoverFailed(true)}
          className="max-h-80 w-full rounded-nx-sm border border-nx-border-subtle object-cover"
        />
      )}

      {hasTitle && (
        // Heading level is deliberately not <h2>: a card sits inside a feed whose own
        // heading structure is the page's, and a per-post heading would make the outline
        // nonsense. Weight and size carry the hierarchy instead.
        <p className="text-nx-heading font-semibold text-nx-text-primary">{title}</p>
      )}

      {hasSummary && (
        <p className="whitespace-pre-wrap break-words text-nx-body-sm text-nx-text-secondary">
          {summary}
        </p>
      )}
    </div>
  );
}
