'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Badge, Card, DeveloperIdentity, DeveloperMeta } from '@/shared/components';
import { RepScore } from '@/features/reputation';
import { useT } from '@/core/i18n';
import { cn } from '@/shared/lib/cn';
import { useRelativeTime } from '@/shared/lib/format';
import type { LocationResolution } from '../types/location';
import { ExpandableBlock } from './expandable-block';
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
 * `postType` IS A PROP NOW, and the note it replaces was right until round 15. It read: "the card
 * renders a body it is handed rather than switching on the type itself … accepting it for later
 * would be an unused prop that invites a switch statement straight back into the shell."
 *
 * The reasoning still holds and is why the prop is used the way it is: the card renders the type
 * as a LABEL and never branches on it. There is no switch here, no per-type layout, and the body
 * still arrives fully built through the `body` slot. What changed is that the DS's block spec puts
 * the kind of thing in the badge row at the top of the body, so the type became something the card
 * has to *display* rather than something it might have been tempted to *interpret*.
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
  /**
   * The post's last edit, when the backend reports one.
   *
   * B4 added `updatedAt` to the feed payload. It matters more than it looks: three things in
   * this product point AT a post's contents — a verified skill's evidence, a saved AI
   * explanation, and the reputation the post earned — so a post that changes without saying so
   * quietly breaks all three.
   */
  updatedAt?: string | null;
  /** Free text body. Absent on posts that carry only a details block. */
  content?: string | null;
  /**
   * Resolved place, in the same shape `LocationController` returns — the feed echoes
   * `googlePlaceId` / `locationType` / `locationDetails` / `googleMapsUrl` verbatim, so no
   * conversion is needed at the seam.
   */
  location?: LocationResolution;
  hashtags?: string[] | null;
  /**
   * The post's kind, rendered as a label in the badge row and nothing else — see the file note.
   * `REGULAR` is suppressed at the render site rather than here, so a caller never has to know
   * which values are worth showing.
   */
  postType?: string | null;
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
  updatedAt,
  content,
  location,
  hashtags,
  postType,
  commentCount,
  body,
  actions,
  menu,
  className,
}: PostCardProps) {
  const t = useT();
  const relativeTime = useRelativeTime();

  /**
   * A post that was never edited comes back with `updatedAt` equal to `createdAt` — measured on
   * the live payload, the same shape comments have. So equality is the test, not presence.
   */
  const isEdited = updatedAt != null && updatedAt !== createdAt;

  // The feed can hand back a post whose author row was missing when the payload was built,
  // and an identity row with a blank name reads as a rendering bug. Name it as unknown
  // instead of showing an empty line.
  const authorName = author.fullName?.trim() || t('post.unknownAuthor');

  return (
    /**
     * THREE GROUPS AT THE `group` RUNG (16), EVERYTHING INSIDE A GROUP AT `tight` (8) — the round-15
     * block spec. The card used to be a flat column at a single 12px gap, which made "the author"
     * and "the third paragraph of the body" siblings of equal weight. Two rungs instead of one is
     * what turns a list of elements into a face, a body and an acting row.
     *
     * The groups are: who wrote it → what it says → what you can do about it.
     */
    <Card
      className={cn('flex flex-col gap-[var(--nx-space-group)]', className)}
      data-post-id={postId}
    >
      <div className="flex items-start gap-2">
        <DeveloperIdentity
          className="min-w-0 flex-1"
          // Under the name, not beside the `⋯`. See the prop's own note.
          timeBelow
          name={authorName}
          src={author.profilePictureUrl ?? undefined}
          /**
           * THE TIMESTAMP IS THE PERMALINK — added once `/posts/{id}` existed.
           *
           * The card had no way to address itself: every post lived only inside a scrolling list,
           * so one could not be sent to anyone and a post cited as evidence for a skill had no
           * address. The timestamp is where that anchor belongs rather than a new control,
           * because it is already on the row, already the least-interesting text on it, and
           * already where readers look for "this specific post".
           *
           * NOT the author's name and not the whole card: the name's destination is a person (and
           * cannot be built yet — `FeedPostDataDto` has no `authorUsername`, B28), and a
           * card-wide anchor would swallow every reaction click that misses its button.
           */
          time={
            <Link href={`/posts/${postId}`} className="hover:text-nx-text-primary hover:underline">
              {relativeTime(createdAt)}
              {/* ON THE TIMESTAMP, NOT AS A BADGE. "Edited" is a fact about WHEN this text became
                  what you are reading, so it belongs to the time, not beside the author's name
                  where a badge would compete with the reputation chip. Comments already say it
                  this way; posts could not until `updatedAt` existed. */}
              {isEdited ? <> · {t('post.comments.edited')}</> : null}
            </Link>
          }
          rep={
            /**
             * A ZERO SCORE RENDERS NOTHING, and that is a change from "0 is a real score so it
             * still renders". Both readings are defensible; this one is chosen by looking at a
             * real feed.
             *
             * The chip exists to tell one author apart from another. Everyone starts at 0, so on
             * any feed with new accounts it repeated `0 · Newcomer` beside every name — seven
             * identical chips down one column, saying nothing except that the product has a
             * scoring system. Suppressing it at 0 costs nothing (there is no reputation to
             * report) and makes a chip that DOES appear mean something.
             *
             * `> 0` rather than `!= null`: null and undefined still mean "not sent", and now 0
             * means "nothing earned yet", which reads the same to a person.
             */
            author.eliteScore != null && author.eliteScore > 0 ? (
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

      {/* THE BODY GROUP. Prose, the type-specific body, the location and the hashtags are all one
          thing — what the post says — so they sit at the `tight` rung together and the 16 above
          separates them from the face rather than from each other. Rendered only when it has
          something in it, so a bare-body post does not pay for an empty 16. */}
      {(content || body || location || (hashtags && hashtags.length > 0)) && (
        <div className="flex flex-col gap-[var(--nx-space-tight)]">
          {/**
           * THE BADGE ROW OPENS THE BODY, and it used to not exist at all — the post type was
           * invisible and the hashtags sat alone at the very bottom of the card, after the
           * location and before the rule.
           *
           * Reading order is what changed: the DS puts *what kind of thing this is* and *what it
           * is about* before the prose, so a reader scanning a column can skip a `POLL` or stop on
           * a `Redis` without parsing a paragraph first. At the bottom the same two facts arrive
           * after the reader has already decided.
           *
           * TWO DIFFERENT KINDS OF BADGE, deliberately styled apart. The type is `mono neutral`
           * because it is a machine fact — the enum the backend stored. The hashtags are `accent`
           * because they are author-declared claims about subject matter. Same row, different
           * weight, and the difference is the point.
           *
           * `REGULAR` IS SUPPRESSED: it is the default kind and labelling every ordinary post
           * "REGULAR" would put a badge that never varies on most of the column — the same
           * complaint that removed the `Khác` badge from crawled cards.
           */}
          {(postType && postType !== 'REGULAR') || (hashtags && hashtags.length > 0) ? (
            <div className="flex flex-wrap items-center gap-[var(--nx-space-pair)]">
              {postType && postType !== 'REGULAR' && (
                <Badge mono variant="neutral">
                  {postType}
                </Badge>
              )}
              {hashtags?.map((tag) => (
                // Still not links: `SearchController` has no hashtag handling, so "#kafka" is not
                // a filter the backend understands and an anchor would promise a tag feed that
                // does not exist.
                <Badge key={tag} variant="accent">
                  {tag}
                </Badge>
              ))}
            </div>
          ) : null}
          {content && (
            /**
             * CAPPED AT 280 AND OPENED IN A DIALOG — the same device the code block uses, and for
             * the same reason: a nine-paragraph post is fine on its own permalink and ruins the
             * column it is sitting in. `ExpandableBlock` measures rather than counting characters,
             * so a post that fits at 672 stays uncut and the same post on a phone does not.
             *
             * 280 rather than the code block's 320: prose at `--text-nx-body` 15/1.6 gives about
             * eleven lines, which is a paragraph and the start of the next — enough to decide
             * whether to open it. Code needs the extra because a snippet's first lines are usually
             * imports and a signature, which say less per line than a sentence does.
             *
             * "Xem thêm" GOES TO THE POST, not to a modal — the timestamp above already links to
             * the same place, so the card now has two ways to the full view and no second copy of
             * it. See `ExpandableBlock`.
             */
            <ExpandableBlock maxHeight={280} href={`/posts/${postId}`}>
              {/* `whitespace-pre-wrap` because the composer's textarea keeps the author's line
                  breaks and the backend stores them verbatim; collapsing them here would silently
                  reflow every multi-paragraph post. */}
              <p className="whitespace-pre-wrap break-words text-nx-body text-nx-text-primary">
                {content}
              </p>
            </ExpandableBlock>
          )}

          {body}

          {location && <LocationBadge location={location} mapsLabel={t('post.openInMaps')} />}
        </div>
      )}

      {/* Footer exists only when there is something in it — an empty rule under every post
          is noise. The like count is NOT shown here: it belongs next to the reaction
          control that c-2 puts in `actions`, and showing it twice would let the two drift
          apart on the same screen. */}
      {/* `commentCount` truthy, NOT `!== undefined`. A post with zero comments rendered
          "0 bình luận" under a hairline — and the design system's rule is that counts hide
          at zero rather than printing a 0. It also meant a brand-new post drew the
          reading/acting hinge for a footer whose only content was that zero. */}
      {(!!commentCount || actions) && (
        /**
         * THE RULE IS BLED TO THE CARD EDGE — `-mx-5` cancels the card's own 20px horizontal
         * padding so the
         * line runs the full width. An inset rule reads as a divider *inside* a box; a bled one
         * reads as the card's own hinge, which is what it is: above it the post, below it what you
         * can do about the post. That distinction is the reason the reaction strip needs no label.
         *
         * 16 above and 16 below. The 16 above is the group rung, paid by the card's `gap`; the 16
         * below is `pt-4` here, so the rule sits centred in a 32px band rather than being crowded
         * against the strip.
         */
        <div className="flex flex-col gap-[var(--nx-space-tight)]">
          {/* `-mx-5`, NOT `-mx-4`. This said 4 for as long as card padding was a single 16.
              R8 made padding two-axis — 20 horizontal, 16 vertical — and nothing came back
              here, so the hinge stopped 4px short of both card edges and read as a divider
              inside a box instead of the card's own hinge. Measured against `Card`'s
              `16px 20px` default. */}
          <div className="-mx-5 border-t border-nx-border-subtle" aria-hidden />
          <div className="flex flex-col gap-[var(--nx-space-tight)] pt-2">
            {/* ONLY WHEN THERE IS NO ACTION STRIP. Where one exists — the feed, a permalink —
                `ReactionBar` prints both counts on one row at its right edge, which is what the
                owner asked for; printing this line too would put "5 bình luận" twice on one card.
                Search results and other read-only surfaces render no strip, and there this is the
                only place the count appears at all. */}
            {!!commentCount && !actions && (
              <DeveloperMeta>{t('post.commentCount', { count: commentCount })}</DeveloperMeta>
            )}
            {actions}
          </div>
        </div>
      )}
    </Card>
  );
}
