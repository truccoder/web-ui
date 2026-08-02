'use client';

import type { ReactNode } from 'react';
import { Card, DeveloperIdentity, DeveloperMeta } from '@/shared/components';
import { RepScore } from '@/features/reputation';
import { useT } from '@/lib/i18n';
import { cn } from '@/shared/lib/cn';
import { useRelativeTime } from '@/shared/lib/format';
import type { LocationResolution } from '../types/location';
import { LocationBadge } from './location-badge';

/**
 * The read side of a post: the surface every cycle-2 and cycle-3 interaction hangs off.
 *
 * PROPS ARE DECOMPOSED ON PURPOSE — this component does NOT take the feed's post DTO.
 * The payload it renders is `FeedPostDataDto`, which lives in the backend package
 * `com.socialapp.newsfeed`, so the matching frontend type belongs to `features/newsfeed`
 * (CLAUDE.md §4: a type belongs to the feature that owns it). Accepting that DTO here would
 * point posts → newsfeed, the wrong way round — newsfeed already renders this card and the
 * composer. So the card takes plain, already-split props, and whoever holds the payload
 * does the mapping. `features/search` embeds the same post shape under a different DTO and
 * can reuse this card for free, which is the second reason not to bind to one of them.
 *
 * WHAT IS DELIBERATELY NOT HERE (each has its own checkpoint, and each would otherwise be
 * guesswork):
 *  - the type-specific body (code block, article, poll, book, …) → `body` slot, cycle 2 c-1′
 *  - the reaction control → `actions` slot, c-2
 *  - the comment thread → `actions` slot, c-3
 *  - edit / delete / accept-answer → `menu` slot, c-4
 * Slots rather than flags: the card should not grow a boolean per feature, and the things
 * that fill them live in files that do not exist yet.
 *
 * Note what is NOT a prop either: `postType`. The card renders a body it is handed rather
 * than switching on the type itself, so the type stays with whoever builds that body.
 * Accepting it "for later" would be an unused prop that invites a switch statement straight
 * back into the shell.
 */

/** Everything the identity row needs, as the feed payload actually spells it. */
export interface PostCardAuthor {
  id: number;
  fullName?: string | null;
  profilePictureUrl?: string | null;
  /**
   * Elite Score, embedded in the feed/search payload so the card never calls the
   * reputation endpoint. Undefined hides the chip — it is never defaulted to 0, which
   * would render a real-looking score for a user whose score simply was not sent.
   */
  eliteScore?: number | null;
  /**
   * The level's name (`authorLevelName`), also embedded in both payloads.
   *
   * PASSED THROUGH, NEVER DERIVED. CLAUDE.md §1 keeps the level thresholds in exactly two places
   * — the backend's `RepLevel` enum and the design system's `REP_LEVELS` — and forbids a third
   * copy on the frontend. `RepScore` therefore refuses to compute a level from a score, and this
   * is how the name reaches it. Absent means the suffix is simply omitted; nothing guesses.
   */
  levelName?: string | null;
}

export interface PostCardProps {
  postId: number;
  author: PostCardAuthor;
  /** ISO timestamp; rendered as a relative label. */
  createdAt: string;
  /** Free text body. Absent on posts that carry only a details block. */
  content?: string | null;
  /**
   * Resolved place, in the same shape `LocationController` returns — the feed echoes
   * `googlePlaceId` / `locationType` / `locationDetails` / `googleMapsUrl` verbatim, so no
   * conversion is needed at the seam.
   */
  location?: LocationResolution;
  hashtags?: string[] | null;
  commentCount?: number;
  /** Type-specific body. */
  body?: ReactNode;
  /** Reaction bar / comment thread. */
  actions?: ReactNode;
  /** Author-only controls, right of the identity row. */
  menu?: ReactNode;
  className?: string;
}

/* `useRelativeTime` used to live here. P2.6cd promoted it to `shared/lib/format.ts` — the
   condition this file set for that ("promote it when something else needs the same labels")
   came true when `features/notifications` needed the identical "2 giờ trước" label. Its i18n
   keys moved from `post.*` to `time.*` in the same step. */

export function PostCard({
  postId,
  author,
  createdAt,
  content,
  location,
  hashtags,
  commentCount,
  body,
  actions,
  menu,
  className,
}: PostCardProps) {
  const t = useT();
  const relativeTime = useRelativeTime();

  // The feed can hand back a post whose author row was missing when the payload was built,
  // and an identity row with a blank name reads as a rendering bug. Name it as unknown
  // instead of showing an empty line.
  const authorName = author.fullName?.trim() || t('post.unknownAuthor');

  return (
    <Card padding={16} className={cn('flex flex-col gap-3', className)} data-post-id={postId}>
      <div className="flex items-start gap-2">
        <DeveloperIdentity
          className="min-w-0 flex-1"
          name={authorName}
          src={author.profilePictureUrl ?? undefined}
          time={relativeTime(createdAt)}
          rep={
            // Null and undefined both mean "not sent"; 0 is a real score and still renders.
            author.eliteScore != null ? (
              <RepScore
                score={author.eliteScore}
                size="sm"
                // `showLevel` is gated on the name actually being there rather than passed
                // unconditionally: `RepScore` drops the suffix without a `levelName`, so this
                // only avoids asking for something the payload did not supply.
                showLevel={Boolean(author.levelName)}
                levelName={author.levelName ?? undefined}
              />
            ) : undefined
          }
        />
        {menu}
      </div>

      {content && (
        // `whitespace-pre-wrap` because the composer's textarea keeps the author's line
        // breaks and the backend stores them verbatim; collapsing them here would silently
        // reflow every multi-paragraph post.
        <p className="whitespace-pre-wrap break-words text-nx-body text-nx-text-primary">
          {content}
        </p>
      )}

      {body}

      {location && <LocationBadge location={location} mapsLabel={t('post.openInMaps')} />}

      {hashtags && hashtags.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {hashtags.map((tag) => (
            // Not links. `SearchController` is one free-text query over users/posts/books
            // with no hashtag handling at all, so "#kafka" is not a filter the backend
            // understands — linking it would promise a tag feed that does not exist.
            <span key={tag} className="text-nx-caption text-nx-text-accent">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer exists only when there is something in it — an empty rule under every post
          is noise. The like count is NOT shown here: it belongs next to the reaction
          control that c-2 puts in `actions`, and showing it twice would let the two drift
          apart on the same screen. */}
      {(commentCount !== undefined || actions) && (
        <div className="flex flex-col gap-3 border-t border-nx-border-subtle pt-3">
          {commentCount !== undefined && (
            <DeveloperMeta>{t('post.commentCount', { count: commentCount })}</DeveloperMeta>
          )}
          {actions}
        </div>
      )}
    </Card>
  );
}
