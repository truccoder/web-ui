'use client';

import { useState } from 'react';
import { EmptyState, Skeleton } from '@/shared/components';
import { useMyProfile } from '@/features/security';
import { useT } from '@/core/i18n';
import { getErrorMessage } from '@/shared/lib/api-error';
import { cn } from '@/shared/lib/cn';
import {
  groupComments,
  useComments,
  useCreateComment,
  useDeleteComment,
  useRemoveCommentReaction,
  useUpdateComment,
  useUpsertCommentReaction,
} from '../hooks/use-comment';
import { useAcceptAnswer, useUnacceptAnswer } from '../hooks/use-post';
import { CommentComposer } from './comment-composer';
import { CommentItem } from './comment-item';

/**
 * The comment thread for one post — fills `PostCard`'s `actions` slot.
 *
 * TWO LEVELS, AND REPLYING TO A REPLY NOW WORKS — FLAT, WITH A TAG.
 *
 * The backend has not changed: `CommentService.validateParentComment` still rejects a reply whose
 * parent is itself a reply, so this thread is two levels deep and cannot be three. What changed is
 * the answer to "then what happens when someone wants to answer a reply".
 *
 * THE NOTE THAT STOOD HERE REFUSED TO DO IT, and the refusal was reasoned: offering reply
 * everywhere and "silently re-pointing the parent at the thread root would put the new reply
 * somewhere other than under the comment the user answered, which is worse than not offering it".
 * The word carrying that argument is **silently**. Facebook and TikTok flatten exactly the same
 * way and it does not read as misplaced, because the reply opens with the handle of the person
 * being answered — the tag replaces the position as the thing that says who this is for.
 *
 * SO: pressing reply on a second-level comment opens the same box, pointed at the same root, with
 * `@their_handle ` already in it. The reply lands at the end of the same column, in the order it
 * was written, which is what a reader scanning a conversation actually wants — and unlike a third
 * level, it is a shape the backend accepts.
 *
 * WHAT MAKES THE TAG REAL RATHER THAN DECORATION is that `CommentItem` renders `@handle` as a
 * link to that profile — see `withMentions` there — and that the person named actually hears
 * about it. That second half was missing when this was built and is not any more: B20 shipped
 * `MentionScanner` + `USER_MENTIONED` (BE `ee89d77`, 24/08), scanning `content` for handles, so
 * the tag this box inserts is the notification. Nothing had to change on the wire for that —
 * which is why the backend was asked for the scanner rather than for a `mentionedUserIds` field.
 *
 * THE ONE THING THE READER STILL CANNOT DO IS FOLLOW THAT NOTIFICATION BACK HERE. It carries the
 * comment's id, and no route in this app takes one — filed as B23.
 *
 * NOTHING IS SPLICED INTO THE CACHED LIST. Every mutation returns void, and deleting a root
 * takes its replies with it via a Postgres cascade that is invisible in the Java. The hooks
 * therefore invalidate and refetch the whole thread; this component just renders what comes
 * back. `onChanged` is separate, and exists because the *count* on the post card belongs to
 * the feed payload — another domain's cache, which only the composing screen can refresh.
 *
 * MOUNTING THIS STARTS THE FETCH — there is no `collapsed` prop, on purpose. Whether a
 * thread is open is the feed's state, not this component's, and a feed of twenty cards that
 * all mounted a thread would fire twenty comment requests on load. The caller renders this
 * only once the user opens the thread; `useComments` also accepts `undefined` if some
 * future caller needs to hold a mounted-but-idle instance instead.
 *
 * THE LIST GAP IS `block` (20), NOT `turn` (16), AND THE RUNG ABOVE IS THE POINT. `--nx-space-turn`
 * is named for exactly this — "one speaker's turn ↔ the next" — and it was what the thread used,
 * and it was wrong here for a reason the token cannot know: a comment does not end at its last
 * word, it ends at a strip of `h-7` ghost buttons carrying ~7.5px of transparent air below their
 * labels. That air is spent before the eye sees any of it. At 16 two comments read ~23.5px apart
 * while the rows INSIDE one read ~15.5px apart — a 1.5:1 ratio, not enough for a stack of turns to
 * look like turns rather than one run of paragraphs.
 *
 * So the fix is paid on both sides and stays on the ladder: `CommentItem` cancels its own inside
 * gap with `-mt-2` (~7.5 apparent), and this steps out one rung to `block`, the block↔block rung,
 * because after the strip a comment IS a block rather than a turn. Apparent figures land near 7.5
 * inside and 27.5 between — about 3.7:1, which is where grouping starts to read. Going to 24 would
 * have read slightly better still and is off-ladder; the rung was the better trade.
 *
 * NOTHING IS FETCHED HERE FOR THE IDENTITY ROWS ANY MORE, AND THAT IS B22 BEING PAID. This
 * component used to hold a second query beside the comments: `CommentResponseDto` carried no
 * `authorEliteScore` and no `authorLevelName` while the post payload carried both, so the chip on
 * a commenter's name had to be bought one `GET /users/{id}/reputation` at a time — a thread of six
 * comments from four people was four extra requests, collected here rather than inside the rows so
 * that the bill was at least visible in one place.
 *
 * THE BACKEND CARRIES BOTH FIELDS NOW, out of the `findAllById` it was already running to build
 * the page, so the cost is zero queries instead of N. `useReputations`, the memo that fed it and
 * the two props that carried its answer down to `CommentItem` are all deleted; the row reads the
 * score off the comment it was handed, exactly as `PostCard` reads it off the post.
 *
 * THE COMPOSER IS NOT COMMENT N+1. At the old flat `gap-4` it sat exactly as far from the last
 * comment as the comments sat from each other, so the box at the bottom of the thread read as one
 * more entry in the list. It gets the card's own device instead — a hairline with clearance above
 * it — because the relationship it marks is the same one: above, what has been said; below, your
 * turn to say something.
 */
export interface CommentThreadProps {
  postId: number;
  /** Fired after a successful create/edit/delete so the caller can refresh its own payload. */
  onChanged?: () => void;
  /**
   * Turns on the accept-answer control. True only when the post is a QNA **and** the signed-in
   * user wrote it — `PostService.acceptAnswer` throws otherwise, and on a QNA post whose
   * `qnaDetails` is null it throws even for the author.
   */
  canAcceptAnswer?: boolean;
  /** `QnaDetails.acceptedAnswerId` from the post payload, so the chosen answer is marked. */
  acceptedAnswerId?: number | null;
  className?: string;
}

export function CommentThread({
  postId,
  onChanged,
  canAcceptAnswer = false,
  acceptedAnswerId,
  className,
}: CommentThreadProps) {
  const t = useT();
  const profile = useMyProfile();

  /**
   * Which reply box is open, and who it is answering.
   *
   * `rootId` IS THE PARENT THAT WILL BE SENT — always a top-level comment, never a reply, because
   * that is the only shape `validateParentComment` accepts. `mention` is the handle of the person
   * whose comment was pressed, which is `undefined` when that was the root itself: answering the
   * comment your reply sits directly under does not need a tag to say so.
   *
   * ONE OBJECT RATHER THAN TWO STATES so the pair can never disagree — a stale `mention` left
   * over from a previous target would tag the wrong person, and that is a mistake the reader
   * would have to spot and delete by hand.
   */
  const [replyingTo, setReplyingTo] = useState<{ rootId: number; mention?: string } | null>(null);

  const comments = useComments(postId);
  const notify = { onSuccess: () => onChanged?.() };
  const create = useCreateComment(notify);
  const update = useUpdateComment(notify);
  const remove = useDeleteComment(notify);
  // `useAcceptAnswer` already invalidates `postKeys.comments(postId)` itself — it was written
  // that way in cycle 1, before this query existed. `onChanged` is still needed on top,
  // because the post's own `qnaDetails.isResolved` lives in the feed payload, not here.
  const accept = useAcceptAnswer({ onSuccess: () => onChanged?.() });
  const unaccept = useUnacceptAnswer({ onSuccess: () => onChanged?.() });

  /**
   * REACTING DOES NOT CALL `onChanged`, and that is the one place these two differ from every
   * other write in this file.
   *
   * `onChanged` exists to refetch the POST's payload, because the comment COUNT on the card lives
   * there and only a create or a delete moves it. A reaction moves `likeCount` on one comment row,
   * which lives in this thread's own cache and which the mutations patch and then re-fetch
   * themselves. Wiring it here would put a whole feed request behind every click on a thumb.
   */
  const react = useUpsertCommentReaction();
  const unreact = useRemoveCommentReaction();

  /**
   * `null` REMOVES, `'LIKE'` UPSERTS, AND THERE IS NO THIRD CASE SINCE B24. `CommentItem` resolves
   * which of the two it means from the row's own `myReaction` — see `onReact` there — so this
   * never has to guess, and the DELETE (which answers 404 when there is nothing to remove) can
   * only fire where there is.
   */
  const reactHandler = (commentId: number, reactionType: 'LIKE' | null) => {
    if (reactionType === null) unreact.mutate({ postId, commentId });
    else react.mutate({ postId, commentId, reactionType });
  };

  // THE PAYLOAD IS THE ONLY SOURCE NOW. Until F-A this line read
  // `acceptedAnswerId ?? acceptedInSession`, backed by a `useState` that remembered the pick
  // for the lifetime of the mount — necessary while `fanOutPost` did not copy `qnaDetails`
  // onto `FeedPostDataDto`, so the prop came back undefined after a successful accept and the
  // control stayed on every comment. The backend copies it now (measured at F-A: the live feed
  // answers `qnaDetails` non-null on the QNA post), so the remembered copy would only be a
  // second truth that a re-fetch could contradict.
  const acceptedId = acceptedAnswerId ?? null;

  // ACCEPTING IS STILL ONCE-ONLY, but no longer permanent. `acceptAnswer` throws "An answer has
  // already been accepted for this post" while one is set, so the control leaves every comment
  // the moment one is chosen — offering it would be a button whose only outcome is a 400. The
  // way back is `unacceptAnswer`, which is offered on the accepted comment itself.
  const acceptHandler =
    canAcceptAnswer && acceptedId == null
      ? (commentId: number) => accept.mutate({ postId, commentId })
      : undefined;

  // Only the author gets to undo, and only while there is something to undo. Reputation
  // awarded for the pick is revoked by the backend under the same `sourceId`.
  const unacceptHandler =
    canAcceptAnswer && acceptedId != null ? () => unaccept.mutate(postId) : undefined;

  /**
   * EVERY PAGE, FLATTENED, THEN GROUPED — in that order, and the order is what makes it correct.
   * The backend pages TOP-LEVEL comments and ships each root's replies inside the same page (see
   * `CommentPage`), so concatenating pages can never separate a reply from its root and
   * `groupComments` sees exactly the flat two-level list it always did.
   */
  const rows = comments.data?.pages.flatMap((page) => page.comments) ?? [];
  const thread = groupComments(rows);
  // Reaction failures join the same line: the optimistic chip has already rolled back by the time
  // this renders, so without a sentence the click would appear to have simply not registered.
  const mutationError =
    create.error ?? update.error ?? remove.error ?? react.error ?? unreact.error;

  // Which single row is mid-flight, so only that row shows a spinner. `update`/`remove`
  // carry the id in their variables; `create` has no row yet.
  const pendingCommentId =
    (update.isPending ? update.variables?.commentId : undefined) ??
    (remove.isPending ? remove.variables?.commentId : undefined) ??
    null;

  if (comments.isLoading) {
    return (
      // The same region padding the loaded thread carries, so the discussion does not jump 16px
      // up the card the moment the comments arrive.
      <div className={cn('flex flex-col gap-3 pt-[var(--nx-space-group)]', className)}>
        <Skeleton lines={2} />
        <Skeleton lines={2} />
      </div>
    );
  }

  if (comments.isError) {
    return (
      <EmptyState
        compact
        className={className}
        title={t('post.comments.loadFailed')}
        description={getErrorMessage(comments.error)}
      />
    );
  }

  return (
    /**
     * `pt-[group]` PUTS A REGION BOUNDARY WHERE THE CARD HAD ITS TIGHTEST GAP.
     *
     * `PostCard` renders `actions` as one column at `--nx-space-tight` (8), and the feed passes
     * `ReactionBar` and this thread into that slot as siblings — so the step from "what you can do
     * about this post" to "the discussion about this post" was 8px, while two comments inside the
     * discussion were 16 apart. The most important boundary on the card was its narrowest one.
     * 8 + 16 = 24 restores the order without the card having to know what it is stacking.
     */
    <div className={cn('flex flex-col gap-4 pt-[var(--nx-space-group)]', className)}>
      {thread.length === 0 ? (
        <EmptyState compact title={t('post.comments.empty')} />
      ) : (
        // 20 between turns — see the module note on why this is `block` and not `turn`.
        <ul className="flex flex-col gap-5">
          {thread.map((root) => (
            <li key={root.id} className="flex flex-col gap-3">
              <CommentItem
                comment={root}
                replies={root.replies}
                currentUserId={profile.data?.id}
                onReact={reactHandler}
                // No `mention`: this box already sits under the comment it answers.
                onReply={() => setReplyingTo({ rootId: root.id })}
                onAcceptAnswer={acceptHandler}
                isAcceptedAnswer={acceptedId === root.id}
                onUnacceptAnswer={unacceptHandler}
                onEdit={(commentId, content) =>
                  update.mutate({ postId, commentId, payload: { content } })
                }
                onDelete={(commentId) => remove.mutate({ postId, commentId })}
                pendingCommentId={pendingCommentId}
                editError={update.error ? getErrorMessage(update.error) : null}
              />

              {root.replies.length > 0 && (
                /**
                 * Indent is the only thing marking a reply, and it stops at one level because the
                 * data does.
                 *
                 * `pl-5` (20), UP FROM 12. `CommentItem` now hangs its body off a 42px avatar
                 * rail, so a 13px step read as smaller than the offset inside a single comment —
                 * the nesting was quieter than the thing being nested. 20 is `--nx-space-block`,
                 * the block↔block rung, and it clears the rail's own visual weight.
                 *
                 * `gap-5` to match the root list: replies are turns too, and they carry the same
                 * strip of ghost buttons, so they owe the same optical debt.
                 */
                <ul className="flex flex-col gap-5 border-l border-nx-border-subtle pl-5">
                  {root.replies.map((reply) => (
                    <li key={reply.id}>
                      <CommentItem
                        comment={reply}
                        currentUserId={profile.data?.id}
                        onReact={reactHandler}
                        /**
                         * THE PARENT IS THE ROOT, NOT THIS ROW — a reply cannot parent a reply.
                         * The handle is what recovers the information that flattening loses.
                         *
                         * WITHOUT `authorUsername` THERE IS NO TAG AND THE REPLY IS STILL SENT.
                         * `CommentResponseDto.authorUsername` arrived with B13 and every seeded
                         * row carries one, but the field is optional on the wire, so this degrades
                         * to an untagged flat reply rather than to a disabled button. A reply the
                         * reader can send and cannot address beats a button that does nothing.
                         */
                        onReply={() =>
                          setReplyingTo({
                            rootId: root.id,
                            mention: reply.authorUsername ?? undefined,
                          })
                        }
                        onAcceptAnswer={acceptHandler}
                        isAcceptedAnswer={acceptedId === reply.id}
                        onUnacceptAnswer={unacceptHandler}
                        onEdit={(commentId, content) =>
                          update.mutate({ postId, commentId, payload: { content } })
                        }
                        onDelete={(commentId) => remove.mutate({ postId, commentId })}
                        pendingCommentId={pendingCommentId}
                        editError={update.error ? getErrorMessage(update.error) : null}
                      />
                    </li>
                  ))}
                </ul>
              )}

              {replyingTo?.rootId === root.id && (
                <CommentComposer
                  /**
                   * `key` REMOUNTS THE BOX WHEN THE TARGET CHANGES, and without it this feature
                   * would look broken in the most ordinary case. `initialValue` seeds the
                   * composer's state ONCE at mount, by design (see its own note) — so pressing
                   * reply on one person and then on another, without closing the box in between,
                   * would leave the first person's handle in it. The box is one element in the
                   * tree either way; only its identity changes.
                   */
                  key={replyingTo.mention ?? 'root'}
                  // The same 20 the reply list uses: the box you type a reply into belongs to the
                  // column the replies live in, not to the root comment's.
                  className="pl-5"
                  /**
                   * THE TAG, WITH ITS TRAILING SPACE. The space is not cosmetic — the caret lands
                   * after it (`CommentComposer` places it at the end), so the reader types their
                   * sentence rather than a word welded onto a handle. It survives `content.trim()`
                   * on submit because it is interior text by then.
                   *
                   * IT IS EDITABLE, AND THAT IS THE POINT of putting it in the textarea instead of
                   * on a chip above it: answering two people at once, or deciding halfway through
                   * that the tag is noise, are both things a reader can just do.
                   */
                  initialValue={replyingTo.mention ? `@${replyingTo.mention} ` : undefined}
                  placeholder={t('post.comments.replyPlaceholder')}
                  submitLabel={t('post.comments.reply')}
                  onCancel={() => setReplyingTo(null)}
                  onSubmit={(content) => {
                    // ALWAYS `root.id`. A second-level reply is flattened onto the same parent —
                    // the backend rejects anything else — and the handle inside `content` is what
                    // carries who it answers. See the module note.
                    create.mutate({ postId, payload: { content, parentId: root.id } });
                    setReplyingTo(null);
                  }}
                  pending={create.isPending}
                  autoFocus
                />
              )}
            </li>
          ))}
        </ul>
      )}

      {/* THE NEXT PAGE, AND ONLY WHEN THERE IS ONE. `hasNextPage` comes from the page's own
          `hasMore` rather than from a short page, so this disappears on the last one instead of
          after a press that returns nothing. Text, not a card: it belongs to the list above it,
          and a filled button here would compete with the composer below. */}
      {comments.hasNextPage && (
        <button
          type="button"
          onClick={() => comments.fetchNextPage()}
          disabled={comments.isFetchingNextPage}
          className={cn(
            'self-start rounded-nx-sm px-1 py-1 text-nx-body-sm text-nx-text-muted',
            'transition-colors duration-[var(--nx-duration-fast)] ease-nx-out',
            'hover:text-nx-text-primary hover:underline disabled:opacity-50',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring'
          )}
        >
          {t('post.comments.loadMore')}
        </button>
      )}

      {/* `key` is the reset: a confirmed write changes it, React remounts an empty box, and
          nothing calls setState from an effect to get there. `submittedAt` moves on every
          attempt but is only read once the attempt SUCCEEDED, so a rejected comment keeps
          the user's draft. */}
      {/* THE HINGE, AND THE SAME ONE THE CARD'S FOOTER USES — see the module note. The rule is
          `mt-2` clear of the 16 the column already gives it, so it sits centred in the band
          rather than pressed against the last comment, and the composer gets a full group rung
          below it. Nothing is bled to the card edge here: this rule separates two things INSIDE
          the discussion, which is exactly the "divider in a box" reading `PostCard` avoids for
          its own hinge and wants for this one. */}
      <div className="mt-2 flex flex-col gap-[var(--nx-space-group)]">
        <div className="border-t border-nx-border-subtle" aria-hidden />
        <CommentComposer
          key={create.isSuccess ? create.submittedAt : 'draft'}
          onSubmit={(content) => create.mutate({ postId, payload: { content } })}
          pending={create.isPending && replyingTo === null}
          error={create.error ? getErrorMessage(create.error) : null}
        />
      </div>

      {/* Delete and the two reaction writes have no box of their own to report into — the
          composers carry their own `error` — so their failures surface here. */}
      {mutationError &&
        (mutationError === remove.error ||
          mutationError === react.error ||
          mutationError === unreact.error) && (
          <p role="status" className="text-nx-micro text-nx-status-danger-fg">
            {getErrorMessage(mutationError)}
          </p>
        )}
    </div>
  );
}
