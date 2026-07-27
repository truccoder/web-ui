'use client';

import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { cn } from '@/shared/lib/cn';
import type { LinkDetails } from '../types/post';

/**
 * Read side of a `LINK` post — fills `PostCard`'s `body` slot.
 *
 * EVERY FIELD HERE WAS TYPED BY THE AUTHOR. Nothing on the backend fetches the target page:
 * there is no unfurl, so `title`, `description` and `thumbnailUrl` are whatever was entered
 * in the composer and may contradict the actual page. That is why the host is always shown
 * from the URL itself — it is the one piece of the preview the author could not misstate.
 */
export interface LinkBodyProps {
  details: LinkDetails;
  className?: string;
}

/** Host without `www.`, or null when the URL will not parse (the composer validates, the
 *  backend does not, and older rows predate that check). */
function hostOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

export function LinkBody({ details, className }: LinkBodyProps) {
  const t = useT();
  const [thumbFailed, setThumbFailed] = useState(false);
  const { url, title, description, thumbnailUrl } = details;

  const host = hostOf(url);
  // An unparseable URL must not become an <a href> — it would either navigate nowhere or,
  // worse, resolve relative to our own origin.
  if (!url || !host) return null;

  const showThumb = Boolean(thumbnailUrl?.trim()) && !thumbFailed;

  return (
    <a
      href={url}
      target="_blank"
      // `noopener` is the security half (the opened page cannot touch `window.opener`);
      // `noreferrer` keeps our URLs out of a third party's analytics.
      rel="noopener noreferrer"
      className={cn(
        'flex gap-3 overflow-hidden rounded-nx-sm border border-nx-border-default p-3',
        'transition-colors duration-[var(--nx-duration-fast)] ease-nx-out',
        'hover:border-nx-border-strong hover:bg-nx-surface-hover',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring',
        className
      )}
    >
      {showThumb && (
        // Author-supplied URL from an arbitrary host — same reasoning as the article cover.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbnailUrl}
          alt=""
          onError={() => setThumbFailed(true)}
          className="size-16 shrink-0 rounded-nx-xs border border-nx-border-subtle object-cover"
        />
      )}

      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex items-center gap-1.5 font-mono text-nx-micro text-nx-text-muted">
          <ExternalLink aria-hidden className="size-3 shrink-0" />
          <span className="truncate">{host}</span>
        </span>

        {/* Falls back to the host rather than to the raw URL: a long URL wraps into an
            unreadable block, and the host already says where the link goes. */}
        <span className="truncate text-nx-ui font-semibold text-nx-text-primary">
          {title?.trim() || host}
        </span>

        {description?.trim() && (
          <span className="line-clamp-2 text-nx-body-sm text-nx-text-secondary">{description}</span>
        )}
      </span>

      <span className="sr-only">{t('post.body.openLink')}</span>
    </a>
  );
}
