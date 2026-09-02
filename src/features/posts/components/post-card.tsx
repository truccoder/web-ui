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
  /**
   * The author's handle — the ONLY key `/u/{username}` takes, and the reason the name on a
   * card can finally be a link.
   *
   * IT USED TO BE UNGETTABLE. `FeedPostDataDto` carried `authorId` and no username, and no
   * endpoint mapped one to the other (`/users/{id}/reputation` returns a score,
   * `/users/{id}/posts` returns posts), so there was no frontend route round it — written up as
   * B13 in `docs/backend-plan.md`. The backend added `authorUsername` to the feed payload and
   * the mapper fills it from the join it was already doing for `authorLevelName`.
   *
   * Still optional, and absent still means plain text rather than a broken link: a payload that
   * predates the field, or a search DTO that has not caught up, must not render an anchor to
   * `/u/undefined`.
   */
  username?: string | null;
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
  /**
   * Type-specific content that reads BEFORE the free-text `content` — an ARTICLE's cover,
   * title and summary.
   *
   * Most kinds use `body` (rendered after the prose) because their details block is a
   * secondary attachment hanging off a post whose main thrust is the text: a poll, a linked
   * book, a code snippet. An ARTICLE inverts that — `articleDetails` carries the headline and
   * the teaser, and `content` is the article's body copy — so the order has to be
   * title → summary → content. The caller decides which slot to use; the card still never
   * branches on `postType` itself.
   */
  header?: ReactNode;
  /** Type-specific body, rendered after the free-text `content`. */
  body?: ReactNode;
  /**
   * Attached media — the pictures the author added to the post, as opposed to a kind's own
   * image (an ARTICLE cover, a LINK thumbnail). Rendered LAST in the body group, below the
   * body, the quiz and the location, because a photo gallery is what the reader looks at after
   * they have read the post, not part of reading it. The caller decides what goes here; the
   * card still never branches on `postType`.
   */
  media?: ReactNode;
  /** Reaction bar / comment thread. */
  actions?: ReactNode;
  /** Author-only controls, right of the identity row. */
  menu?: ReactNode;
  /**
   * Render the body at full length, with no cap and no "Xem thêm".
   *
   * THE CAP'S EXIT IS A LINK TO `/posts/{id}`, SO ON `/posts/{id}` IT LEADS NOWHERE. The
   * permalink renders the same card as the feed, which meant a long post arrived there already
   * cut, with a "Xem thêm" that navigated to the page the reader was standing on — Next resolves
   * it to the current route, nothing changes, and the control reads as broken. It was not broken;
   * it had simply run out of anywhere to go.
   *
   * SO THE FLAG IS "AM I THE DESTINATION", NOT "SHOULD I CLAMP". `ExpandableBlock`'s whole
   * argument is that the cap belongs to the FEED — one sixty-line card makes its neighbours
   * unreachable — and that the full text belongs at an address. This is that address. Every other
   * surface (feed, search results, a profile's post list) keeps the cap, because on those the
   * link still has a page to send the reader to.
   *
   * @default false
   */
  expanded?: boolean;
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
  header,
  body,
  media,
  actions,
  menu,
  expanded = false,
  className,
}: PostCardProps) {
  const t = useT();
  const relativeTime = useRelativeTime();

  /**
   * B28 (`docs/backend-plan.md`) closed 30/08: the field is now sourced from `PostEntity#editedAt`,
   * set only by an author's `PUT`, so a never-edited post carries `updatedAt: null` — it is no
   * longer `@UpdateTimestamp` and no longer flips true on the async moderation write ~1-2s after
   * creation. The `!== createdAt` half is now redundant (kept as a no-cost second guard) rather
   * than load-bearing the way it was before this closed.
   */
  const isEdited = updatedAt != null && updatedAt !== createdAt;

  // The feed can hand back a post whose author row was missing when the payload was built,
  // and an identity row with a blank name reads as a rendering bug. Name it as unknown
  // instead of showing an empty line.
  const authorName = author.fullName?.trim() || t('post.unknownAuthor');

  /**
   * The author's page, when the payload says who they are. `encodeURIComponent` because a
   * handle is user-chosen text, not a slug this app minted.
   */
  const authorHref = author.username ? `/u/${encodeURIComponent(author.username)}` : undefined;

  /* `whitespace-pre-wrap` because the composer's textarea keeps the author's line breaks and the
     backend stores them verbatim; collapsing them here would silently reflow every
     multi-paragraph post. Named because it is rendered from two branches — capped and not — and
     the two must not drift into two different paragraphs.

     `@[0]` / `@[1]` … are the tag placeholders the backend stores (`taggedUserIds` order). The
     feed payload carries the ids but no names, so a placeholder that survived to here is shown as
     a neutral "@…" rather than as raw `@[0]` — resolving to the real name needs a backend field
     (`taggedUsers`) that does not exist yet. */
  const displayContent = (content ?? '').replace(/@\[\d+\]/g, '@…');
  const prose = (
    <p className="whitespace-pre-wrap break-words text-nx-body text-nx-text-primary">
      {displayContent}
    </p>
  );

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
          // Puts the link on the name and the picture, and only on those two — see
          // `DeveloperIdentity`'s `href`. The timestamp below stays the POST's permalink; the
          // two anchors on this row point at different things on purpose.
          href={authorHref}
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
           * STILL NOT THE WHOLE CARD: a card-wide anchor would swallow every reaction click that
           * misses its button. The author's NAME is a link now — that half of this note expired
           * when the feed payload grew `authorUsername` — but it points at a person while this
           * points at the post, which is exactly why they are two anchors and not one.
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
      {(content || header || body || media || location || (hashtags && hashtags.length > 0)) && (
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
                // LINKS NOW (B31). The note here used to say an anchor "would promise a tag feed
                // that does not exist" — `GET /posts/public?hashtag=` exists as of B31, so the
                // badge points at it. `/newsfeed?tab=posts&hashtag=` is the same route the card's
                // timestamp and author name already hardcode; the feed folds the tag itself, so a
                // raw `tag` from the payload is a valid value to pass straight through.
                <Link
                  key={tag}
                  href={`/newsfeed?tab=posts&hashtag=${encodeURIComponent(tag)}`}
                  className="rounded-nx-full hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring"
                >
                  <Badge variant="accent">{tag}</Badge>
                </Link>
              ))}
            </div>
          ) : null}

          {/* THE HEADER READS BEFORE THE PROSE. For an ARTICLE this is the cover, the title and
              the summary — its headline, not an attachment — so it has to sit above `content`,
              which holds the article's body copy. `body` below is for kinds whose block trails
              the text. */}
          {header}

          {content &&
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
             *
             * AND ON THE POST ITSELF THERE IS NO CAP AT ALL — see `expanded`. The permalink was
             * getting the feed's clamp plus a "Xem thêm" pointing at its own URL, which is a
             * control that visibly does nothing.
             */
            (expanded ? (
              prose
            ) : (
              <ExpandableBlock maxHeight={280} href={`/posts/${postId}`}>
                {prose}
              </ExpandableBlock>
            ))}

          {body}

          {location && <LocationBadge location={location} mapsLabel={t('post.openInMaps')} />}

          {/* LAST IN THE GROUP. The author's attached pictures are what the reader browses once
              they have read the post — after the body, after a quiz they might take, after the
              place it was posted from — so they close the body group rather than interrupt it. */}
          {media}
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
            {/* ONLY WHEN THERE IS NO ACTION STRIP. Where one exists — the feed, a permalink — the
                strip carries each total beside the glyph it counts, so printing this line too
                would put the comment count on the card twice. Search results and other read-only
                surfaces render no strip, and there this is the only place it appears at all, in
                words rather than as a bare number because it has no glyph to lean on. */}
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
