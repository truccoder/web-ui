'use client';

import * as React from 'react';
import { useState } from 'react';
import Link from 'next/link';
import { ThumbsUp } from 'lucide-react';
import { Badge, Button, DeveloperIdentity } from '@/shared/components';
import { RepScore } from '@/features/reputation';
import { useT } from '@/core/i18n';
import { cn } from '@/shared/lib/cn';
import { useRelativeTime } from '@/shared/lib/format';
import type { PostComment } from '../types/comment';
import type { ReactionType } from '../types/reaction';
import { CommentComposer } from './comment-composer';
import { REACTIONS } from './reaction-bar';

/**
 * One comment: identity row, body, and the author's own controls.
 *
 * "EDITED" IS DERIVED, NOT REPORTED. There is no `isEdited` flag — Hibernate's
 * `@UpdateTimestamp` is generated on INSERT too, so a never-edited comment already carries
 * an `updatedAt` equal to its `createdAt` (measured). Comparing the two is the only signal
 * available, which also means an edit that lands in the same clock tick is invisible. That
 * is a backend limitation, not something to paper over with a local flag.
 *
 * DELETE CONFIRMS INLINE, in two steps, rather than in a dialog. Two reasons, and the first
 * is the important one: deleting a top-level comment ALSO deletes its replies, through a
 * Postgres cascade that no Java code mentions — so the destructive scope is bigger than the
 * row the user clicked, and the confirm says so with the count. The second is that
 * `shared/` has no Dialog component yet and inventing a floating primitive for one confirm
 * is the same trap the reaction picker avoided.
 *
 * THE AVATAR IS A RAIL, AND EVERYTHING UNDER THE NAME HANGS OFF IT — see `GUTTER`. Until this
 * round the body and the control strip were siblings of `DeveloperIdentity`, so they started at
 * the container's left edge, UNDER the picture, while the name started 42px in. The result was a
 * ragged left on every comment: the text did not line up with the name it belonged to, and the
 * only thing marking "these three rows are one person's turn" was an 8px gap.
 *
 * THE VERTICAL RHYTHM IS PAID IN OPTICAL PIXELS, NOT DECLARED ONES. Every control in the strip
 * is a `size="sm"` ghost `Button` — `h-7` around a 13px label — so roughly 7.5px of each button
 * is transparent air above and below its text. Those 7.5px are already spent before any `gap` is
 * added, which is how the thread ended up with ~15.5px of apparent space INSIDE a comment and
 * ~23.5px BETWEEN two of them: a 1.5:1 ratio, far too weak for the eye to read the stack as
 * separate turns rather than one run of paragraphs. `-mt-2` here cancels the container's own gap on
 * the inside — the 7.5 of air IS the 8 the row wanted — and `CommentThread` pays the outside by
 * stepping its list from the `turn` rung to `block`. The pair lands near 7.5 : 27.5, about 3.7:1,
 * which is where grouping actually becomes legible.
 */

/**
 * The avatar column: `Avatar` at `size="md"` (32) plus `DeveloperIdentity`'s own `gap-2.5` (10).
 *
 * WRITTEN AS ONE NUMBER RATHER THAN TWO CLASSES because it is one measurement, and because it has
 * to move the day `avatarSize` below moves. `DeveloperIdentity` owns the picture and the gap
 * internally and exposes neither, so the alignment cannot be derived — it is mirrored here, and
 * this is the note that says so.
 */
const GUTTER = 'ps-[42px]';

/**
 * The same rail for the control strip, minus the 10px (`px-2.5`) a ghost `Button` carries.
 *
 * THAT PADDING IS A HIT-AREA, NOT A GAP. This used to be `-ml-2.5` for exactly that reason — the
 * strip sat at the container's edge and the word `Thích` started 10px right of the text it
 * belonged to. The correction is the same one, re-based: 42 for the rail, less 10 that the button
 * will add back, so the LABEL lands on the text's left edge rather than the button's box doing so.
 *
 * On the ROW rather than on the first button, because the first child is not always a button — an
 * accepted answer puts a `Badge` there, whose own `px-2` is close enough to the same 10 that one
 * value serves both.
 */
const GUTTER_CONTROLS = 'ms-8';

/**
 * `@handle` inside a comment body, so a tag reads as a tag rather than as punctuation.
 *
 * WHY THIS EXISTS AT ALL: replying to a reply now prefills the box with the handle of the person
 * being answered, because the backend allows only two levels and the reply therefore lands beside
 * the comment it answers rather than under it (see `CommentThread`). The handle IS the thread —
 * it is the only thing saying who a flat reply is for — so leaving it as grey prose would be
 * shipping the mechanism without the signal.
 *
 * THE PATTERN MUST MATCH `MentionScanner`, AND IT WAS WIDER THAN IT UNTIL 24/08. This started as
 * `[A-Za-z0-9_.]` — capitals and dots — written before the backend had any mention support at
 * all. B20 shipped one (BE `ee89d77`), and the scanner it shipped works from `USERNAME_PATTERN`,
 * which is `[a-z0-9-]`, widened by exactly one character (`_`) to match seed handles like
 * `backend_truc_anh`. Leaving the two out of step is the worst available outcome: the frontend
 * would paint `@Minh.Tran` blue and link it, the backend would never recognise it, and nobody
 * would be notified — a feature that looks like it works and silently does not. So the classes
 * are the same class now, and this note is the reason to change them together.
 *
 * The rest of the shape is the backend's too:
 *  - `(^|\s)` — an `@` must open the string or follow whitespace. `MentionScanner` requires the
 *    same, and its own reason is the sharper one: without it, every comment quoting an email
 *    address notifies whoever happens to hold that handle.
 *  - no length cap, because usernames are the backend's business and a guess here would stop
 *    linking the day someone registers a long one.
 *
 * AN UNKNOWN HANDLE IS NOT A BROKEN LINK. Nothing validates this text — it is prose, and a reader
 * can type `@nobody` — so the destination may not exist. `/u/[username]` answers a bad handle with
 * its own empty state (`isError || !profile`), which is a truthful "no such person" rather than a
 * crash, and is the same thing that happens when someone edits the URL by hand. The backend makes
 * the same split: it notifies only handles that resolve, and leaves the rest as prose.
 */
const MENTION = /(^|\s)@([a-z0-9_-]+)/g;

function withMentions(content: string): React.ReactNode {
  const nodes: React.ReactNode[] = [];
  let cursor = 0;

  for (const match of content.matchAll(MENTION)) {
    // `match.index` is the start of the LEADING WHITESPACE, not of the `@` — group 1 is part of
    // the match and has to be re-emitted as text or the spacing collapses.
    const start = match.index + match[1].length;
    if (start > cursor) nodes.push(content.slice(cursor, start));

    const handle = match[2];
    nodes.push(
      <Link
        key={start}
        href={`/u/${encodeURIComponent(handle)}`}
        className="font-medium text-nx-text-accent hover:underline"
      >
        @{handle}
      </Link>
    );
    cursor = start + handle.length + 1;
  }

  if (cursor < content.length) nodes.push(content.slice(cursor));
  return nodes;
}

export interface CommentItemProps {
  comment: PostComment;
  /** Replies attached to this comment. Only top-level comments can have them. */
  replies?: PostComment[];
  /** Current user's id — controls whether edit/delete are offered at all. */
  currentUserId?: number;
  /**
   * The commenter's Elite Score, for the chip beside their name.
   *
   * A PROP RATHER THAN A HOOK CALL IN HERE, and that is the same rule `PostCard` follows: the
   * row renders identity it is handed and never fetches any of it. `CommentResponseDto` does not
   * carry a score, so somebody has to ask for it — but if that somebody were this component, a
   * thread of six comments would fire six requests from six places and no single file would say
   * so. `CommentThread` asks once for the whole set instead; see `useReputations`.
   *
   * Undefined hides the chip, which is also what a score of zero does — see the render site.
   */
  eliteScore?: number;
  /**
   * The level's NAME, read from the reputation response and never derived from the score.
   * CLAUDE.md §1 keeps the thresholds in the backend enum and the design system only; `RepScore`
   * refuses to compute the level itself, and this is how the name reaches it.
   */
  levelName?: string;
  /**
   * Opens the reply box for this comment. Offered on BOTH levels now.
   *
   * IT TAKES NO ARGUMENT, AND THAT IS THE CHANGE. It used to be `(parentId: number)` and to be
   * passed only to top-level comments, because `CommentService.validateParentComment` rejects a
   * reply whose parent is itself a reply — so a reply had no id it could hand upward that the
   * backend would accept.
   *
   * THE BACKEND LIMIT HAS NOT MOVED; WHAT MOVED IS WHO RESOLVES IT. `CommentThread` renders this
   * row already knowing which root it belongs to, so it binds the parent — always the root — and
   * the person being answered at the render site. This row's job is only "the reader pressed
   * reply here", which is the one fact it actually holds.
   */
  onReply?: () => void;
  onEdit: (commentId: number, content: string) => void;
  onDelete: (commentId: number) => void;
  /**
   * Offered only on a QNA post, and only to the post's author — `acceptAnswer` throws for
   * anyone else and for any other post type. Undefined hides the control entirely.
   */
  onAcceptAnswer?: (commentId: number) => void;
  /** This comment is the post's accepted answer (`QnaDetails.acceptedAnswerId`). */
  isAcceptedAnswer?: boolean;
  /**
   * Takes the acceptance back (`DELETE /qna/accept-answer`). Rendered only on the accepted
   * comment, so it takes no id — the post has at most one. Undefined hides it, which is the
   * case for every reader who is not the post's author.
   */
  onUnacceptAnswer?: () => void;
  /**
   * Set or clear the reader's own reaction on this comment. `null` means remove.
   *
   * THE ROW DECIDES WHAT THE NEXT STATE IS, THE THREAD DECIDES HOW TO SEND IT — the same split
   * `onEdit(commentId, content)` uses. This component holds `comment.myReaction`, so it is the
   * only place that can tell a toggle-off from a toggle-on without the caller re-deriving it; and
   * the thread owns every mutation in the discussion, so it is the only place that should hold a
   * `useMutation`. Passing the resolved *intent* rather than a bare "toggle" also keeps the
   * DELETE from ever firing on a comment with no reaction, which answers 404 rather than
   * shrugging.
   *
   * Undefined disables the control — which is what a read-only surface gets, and what this was
   * hardcoded to before the endpoints existed.
   */
  onReact?: (commentId: number, reactionType: ReactionType | null) => void;
  pendingCommentId?: number | null;
  editError?: string | null;
  className?: string;
}

export function CommentItem({
  comment,
  replies,
  currentUserId,
  eliteScore,
  levelName,
  onReply,
  onEdit,
  onDelete,
  onAcceptAnswer,
  isAcceptedAnswer = false,
  onUnacceptAnswer,
  onReact,
  pendingCommentId,
  editError,
  className,
}: CommentItemProps) {
  const t = useT();
  /**
   * THE SAME CLOCK THE POST USES. This read `formatDateTime`, so a permalink showed the post
   * as `6 ngày trước` and every comment under it as `09:50 13 thg 8, 2026` — two formats for
   * the same kind of fact, a few pixels apart, and the absolute one is the harder of the two
   * to place in a conversation you are reading top to bottom.
   *
   * `useRelativeTime` already falls back to an absolute date past a week, so nothing loses
   * precision where precision starts to matter.
   */
  const relativeTime = useRelativeTime();
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const isAuthor = currentUserId !== undefined && comment.authorId === currentUserId;
  const pending = pendingCommentId === comment.id;
  const edited = comment.updatedAt !== comment.createdAt;
  const replyCount = replies?.length ?? 0;

  /**
   * What the reader picked on THIS comment, and what the toggle therefore wears.
   *
   * IT IS NOT ASSUMED TO BE A LIKE. `CommentResponseDto.myReaction` is the full seven-value enum
   * and the backend accepts every one of them here — the seeded thread genuinely carries
   * `INSIGHT` — so a button hardcoded to `ThumbsUp` would sit un-pressed above a count that
   * already includes the reader's own reaction, and pressing it would silently REPLACE that
   * reaction with a LIKE. Showing what they actually chose is the only version that cannot lie.
   *
   * The fallback is `LIKE`, which is both the default action and the reaction this product is
   * built around — the same fallback, from the same table, that `ReactionBar` uses on a post.
   */
  const myReaction = comment.myReaction;
  const activeReaction = REACTIONS.find((reaction) => reaction.type === myReaction);
  const ReactionIcon = activeReaction?.Icon ?? ThumbsUp;
  const reactionLabelKey = activeReaction?.labelKey ?? 'post.reaction.LIKE';

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <DeveloperIdentity
        size="sm"
        // 32, up from the 24 `size="sm"` picks. The comment text moved from 13 to 15 in the same
        // round and a 24px face under a 15px line reads as a favicon beside prose; the name and
        // meta stay at `sm`, which is why this is `avatarSize` and not `size="md"`.
        avatarSize="md"
        name={comment.authorFullName?.trim() || t('post.unknownAuthor')}
        // The same link the post card's byline got, from the same backend change: `CommentResponseDto`
        // grew `authorUsername`, so a commenter's name and face reach their profile instead of
        // being the one identity row in the thread that goes nowhere.
        href={
          comment.authorUsername ? `/u/${encodeURIComponent(comment.authorUsername)}` : undefined
        }
        src={comment.authorProfilePictureUrl ?? undefined}
        /**
         * THE HANDLE IS THE SECOND LINE, and it is here because the row was a name over nothing.
         * A 32px face beside a single 20px line leaves the bottom half of the picture next to
         * blank space, so the identity read as unfinished next to the post's own byline directly
         * above it — which has a score, a level and a date under the name.
         *
         * `handle` RATHER THAN `meta`: `meta` is the mono micro line the DS reserves for machine
         * facts, and it also REPLACES role + handle wholesale. A username is an identifier a
         * person chose and types out loud, so it belongs on the prose line at caption size — and
         * leaving `meta` free means the day a comment payload carries a job title, `role` can
         * join it without a rewrite.
         *
         * IT ALSO DISAMBIGUATES. Display names are not unique in this product and nothing stops
         * two people sharing one; the handle is the key `/u/{username}` actually routes on, which
         * is the same anchor the name above it already points at.
         */
        handle={comment.authorUsername ? `@${comment.authorUsername}` : undefined}
        /**
         * BESIDE THE NAME, NOT UNDER IT — the DS's identity order is fixed doctrine
         * (avatar → name → reputation → time / role → handle) and this is the same chip, at the
         * same size, that the post card puts on the byline four lines above. Moving it to the
         * second line here would make a comment the one place in the app where the reader has to
         * look somewhere else for the same object.
         *
         * `> 0` FOR THE SAME REASON THE POST CARD USES IT: a brand-new account genuinely scores
         * zero, and a chip reading `0` is a worse answer than no chip — "nothing earned yet" and
         * "nothing to show" read alike to a person, and only one of them costs a badge.
         */
        rep={
          eliteScore != null && eliteScore > 0 ? (
            <RepScore
              score={eliteScore}
              size="sm"
              // Gated on the name being there rather than passed flat: `RepScore` drops the
              // suffix without a `levelName` anyway, so this only avoids asking for something
              // the response did not supply.
              showLevel={Boolean(levelName)}
              levelName={levelName}
            />
          ) : undefined
        }
        /**
         * `đã sửa` RIDES ON THE TIMESTAMP, and it used to stand in the control strip below.
         *
         * WHAT WAS WRONG WITH IT THERE is what the owner saw: the strip is a row of verbs — react,
         * reply, edit, delete — and a past-tense report sat first in that line, in the same size
         * and the same rhythm as the things you can press. It read as a fifth control that had
         * somehow already happened, and it pushed the actual controls one word to the right.
         *
         * WHY THE TIMESTAMP IS THE RIGHT PLACE. `đã sửa` is not an action, it is a qualification
         * of WHEN — "this text is from then, but not the version from then". The post above does
         * exactly this: B4 in `docs/backend-plan.md` asks for `updatedAt` on the feed DTO so the
         * card can mark an edited post "gắn vào timestamp chứ không phải một badge riêng". A
         * comment already has both timestamps, so it can do today what the post is waiting on.
         *
         * `DeveloperMeta` IS DROPPED WITH THE MOVE. `time` is already the mono micro line the DS
         * reserves for machine facts, so wrapping the word in a second such component inside it
         * would double the treatment; the middot is plain text for the same reason.
         */
        time={
          comment.createdAt ? (
            <>
              {relativeTime(comment.createdAt)}
              {edited && ` · ${t('post.comments.edited')}`}
            </>
          ) : undefined
        }
      />

      {editing ? (
        <CommentComposer
          // The editor stands where the body stands: same rail, so switching into edit mode does
          // not shunt the text 42px left and back again.
          className={GUTTER}
          initialValue={comment.content}
          submitLabel={t('post.comments.save')}
          onCancel={() => setEditing(false)}
          onSubmit={(content) => {
            onEdit(comment.id, content);
            setEditing(false);
          }}
          pending={pending}
          error={editError}
          autoFocus
        />
      ) : (
        <>
          {/* `body` (15), UP FROM `body-sm` (13). A comment is prose someone wrote and someone
              else is meant to read, not metadata; at 13 it sat below the post it answers and read
              as a caption on it. It now matches the post's own body, which is what it is. */}
          <p
            className={cn(
              GUTTER,
              'whitespace-pre-wrap break-words text-nx-body text-nx-text-primary'
            )}
          >
            {withMentions(comment.content)}
          </p>

          {/**
           * SEE `GUTTER_CONTROLS` for the horizontal inset and the module note for `-mt-1.5`.
           *
           * `gap-x-0` IS NOT ZERO SPACE. Each button already contributes 10px of `px-2.5` on both
           * sides, so touching boxes still leave 20px between two LABELS — which was 24 at
           * `gap-1`, wider than the 8px separating the strip from the sentence above it. Space
           * between siblings should not exceed space to their own group.
           *
           * `gap-y-1` SURVIVES because the row wraps: the delete confirm swaps two buttons for a
           * warning plus two more, and on a narrow card those land on a second line that must not
           * touch the first.
           */}
          <div
            className={cn(GUTTER_CONTROLS, '-mt-1.5 flex flex-wrap items-center gap-x-0 gap-y-1')}
          >
            {/* Marked before the buttons: on a resolved question this is the first thing a
                reader is looking for. */}
            {isAcceptedAnswer && (
              <Badge dot variant="success">
                {t('post.qna.acceptedAnswer')}
              </Badge>
            )}

            {/* The thread already withholds `onAcceptAnswer` once any answer is accepted
                (accepting is once-only server-side), so this only guards the rare case of a
                caller wiring the two props inconsistently. */}
            {onAcceptAnswer && !isAcceptedAnswer && (
              <Button size="sm" variant="ghost" onClick={() => onAcceptAnswer(comment.id)}>
                {t('post.qna.accept')}
              </Button>
            )}

            {/* The mirror of the above, and mutually exclusive with it by construction: the
                thread hands `onAcceptAnswer` down only while nothing is accepted and
                `onUnacceptAnswer` only while something is. */}
            {onUnacceptAnswer && isAcceptedAnswer && (
              <Button size="sm" variant="ghost" onClick={onUnacceptAnswer}>
                {t('post.qna.unaccept')}
              </Button>
            )}

            {/**
             * THE LIKE CONTROL. IT USED TO BE `disabled` WITH A TOOLTIP SAYING WHY, and the note
             * that stood here recorded the reason: B14 had not landed, `CommentResponseDto`
             * carried no `likeCount` and `CommentController` had no reaction route, so there was
             * nothing to send a like to and nothing to read a total from. All three are untrue
             * now — the DTO carries `likeCount` and `myReaction`, and PUT/DELETE
             * `.../comments/{id}/reactions` exist. The note is kept because the RULE it argued
             * outlived the gap: a button that depresses, thanks you and forgets is worse than no
             * button, which is why this is wired to a real mutation and not to local state.
             *
             * THE LABEL COMES FROM `post.reaction.*`, NOT FROM `post.comments.like`. Those were
             * two words for one enum value — a post's LIKE read `Hữu ích` while the comment
             * directly beneath it read `Thích`, on the same screen, for the same row of the same
             * table. One value, one name; the old pair of keys is deleted rather than left to
             * drift further apart. The word is `sr-only` now — see below — but it is still the
             * name this control answers to, so the two must not drift apart again.
             *
             * GLYPH AND COUNT, NO WORD, at the owner's call and on the Facebook model: the icon
             * already says which reaction it is, and the word beside it was the widest thing in a
             * strip of four controls. `Trả lời`, `Sửa` and `Xoá` keep theirs — they have no glyph
             * that could stand in for a verb, and a row of four bare icons would be a puzzle.
             *
             * THE COUNT LIVES INSIDE THE BUTTON because a comment has no acting row to pin it to
             * the way `ReactionBar` pins a post's totals to the card's right edge, and a bare
             * number floating beside a ghost button reads as unrelated to it. Hidden at zero,
             * like every other count in this product.
             *
             * THE ACTIVE STATE IS A FILLED GLYPH, NOT ONLY A COLOUR (constitution §12): the icon
             * goes from hollow to filled, the glyph and the word change to whichever reaction was
             * picked, and `aria-pressed` carries the same fact to anything that cannot see either.
             * `ReactionBar`'s header owns the reasoning, including why the fill is a 20% tint
             * rather than a solid — lucide has no filled variants and three of the seven glyphs
             * are faces that a real solid would flatten into discs.
             *
             * IT USED TO BE A SOFT CHIP — `bg-nx-accent-soft` — AND THE BOX IS WHAT WENT WRONG,
             * for the same geometry reason that file records at length. `GUTTER_CONTROLS` is
             * `ms-8` (32) rather than the rail's 42 precisely so a ghost `Button`'s own `px-2.5`
             * is absorbed and the LABEL lands on the comment's text column. That is right while
             * the button is a transparent hit-area and wrong the instant it paints: the chip's
             * left edge sat 10px outside the paragraph directly above it, on a row that is
             * otherwise the tidiest left edge in the thread. A fill inside the glyph has no edge
             * to misalign, so the strip stays flush whatever state it is in.
             */}
            <Button
              size="sm"
              variant="ghost"
              icon={<ReactionIcon className={cn(myReaction != null && 'fill-nx-text-accent/20')} />}
              aria-pressed={myReaction != null}
              // Undefined `onReact` means a surface that cannot write — the control greys out
              // rather than vanishing, so the count stays readable.
              disabled={!onReact}
              onClick={() => onReact?.(comment.id, myReaction != null ? null : 'LIKE')}
              // A NATIVE TOOLTIP, UNLIKE THE POST'S TRIGGER, and the difference is the tray. That
              // one opens a row of seven glyphs on hover and a `title` would fade in over them;
              // this one opens nothing, so the hover is free to say what the icon means.
              title={t(reactionLabelKey)}
              className={cn(myReaction != null && 'text-nx-text-accent')}
            >
              {/* `sr-only`, NOT `aria-label`: a label would replace the button's content, and the
                  count is part of what this control says. Keeping the word as hidden text leaves
                  the accessible name reading `Hữu ích 5` — the reaction AND its total — which is
                  exactly what a sighted reader gets from the glyph and the number. */}
              <span className="sr-only">{t(reactionLabelKey)}</span>
              {/* A NUMBER AND NOTHING ELSE. This carried the post row's glyph strip — three
                  small outlines out of `reactionSummary` saying which reactions made up the
                  total — and it comes off here for the same reason it came off there: the owner
                  asked for one icon and one number per control. `ReactionBar`'s header keeps the
                  full reversal; `reactionSummary` is still on `CommentResponseDto` and nothing
                  reads it. */}
              {comment.likeCount > 0 && (
                <span className="font-mono tabular-nums">{comment.likeCount}</span>
              )}
            </Button>

            {onReply && (
              <Button size="sm" variant="ghost" onClick={onReply}>
                {t('post.comments.reply')}
              </Button>
            )}

            {isAuthor && (
              <>
                <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
                  {t('post.comments.edit')}
                </Button>

                {confirmingDelete ? (
                  <>
                    {/* The warning only appears when there is actually something extra to
                        lose, so it never becomes noise people click past. */}
                    <span className="text-nx-micro text-nx-status-danger-fg">
                      {replyCount > 0
                        ? t('post.comments.deleteWithReplies', { count: replyCount })
                        : t('post.comments.deleteConfirm')}
                    </span>
                    <Button
                      size="sm"
                      variant="danger"
                      loading={pending}
                      onClick={() => onDelete(comment.id)}
                    >
                      {t('post.comments.deleteYes')}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirmingDelete(false)}>
                      {t('post.comments.cancel')}
                    </Button>
                  </>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => setConfirmingDelete(true)}>
                    {t('post.comments.delete')}
                  </Button>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
