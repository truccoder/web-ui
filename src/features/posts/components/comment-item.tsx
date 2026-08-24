'use client';

import { useState } from 'react';
import { ThumbsUp } from 'lucide-react';
import { Badge, Button, DeveloperIdentity, DeveloperMeta } from '@/shared/components';
import { useT } from '@/core/i18n';
import { cn } from '@/shared/lib/cn';
import { useRelativeTime } from '@/shared/lib/format';
import type { PostComment } from '../types/comment';
import { CommentComposer } from './comment-composer';

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
 */
export interface CommentItemProps {
  comment: PostComment;
  /** Replies attached to this comment. Only top-level comments can have them. */
  replies?: PostComment[];
  /** Current user's id — controls whether edit/delete are offered at all. */
  currentUserId?: number;
  /**
   * Reply target. Only passed for top-level comments: the backend rejects a reply whose
   * parent is itself a reply, so there is nothing to attach a second level to.
   */
  onReply?: (parentId: number) => void;
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
  pendingCommentId?: number | null;
  editError?: string | null;
  className?: string;
}

export function CommentItem({
  comment,
  replies,
  currentUserId,
  onReply,
  onEdit,
  onDelete,
  onAcceptAnswer,
  isAcceptedAnswer = false,
  onUnacceptAnswer,
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

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <DeveloperIdentity
        size="sm"
        // 32, up from the 24 `size="sm"` picks. The comment text moved from 13 to 15 in the same
        // round and a 24px face under a 15px line reads as a favicon beside prose; the name and
        // meta stay at `sm`, which is why this is `avatarSize` and not `size="md"`.
        avatarSize="md"
        name={comment.authorFullName?.trim() || t('post.unknownAuthor')}
        src={comment.authorProfilePictureUrl ?? undefined}
        time={comment.createdAt ? relativeTime(comment.createdAt) : undefined}
      />

      {editing ? (
        <CommentComposer
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
          <p className="whitespace-pre-wrap break-words text-nx-body text-nx-text-primary">
            {comment.content}
          </p>

          {/**
           * `-ml-2.5` PULLS THE ROW BACK ONTO THE TEXT'S LEFT EDGE.
           *
           * Every control in here is a `size="sm"` ghost `Button`, and those carry `px-2.5` — the
           * kit's `padding: 0 10px`. So the word `Thích` started 10px to the right of the comment
           * it belongs to, and the whole strip read as indented under the text rather than
           * attached to it. The owner asked for a negative margin and it is the right instrument:
           * the padding is a hit-area, not a gap, so it should not push the label off the column.
           *
           * On the ROW rather than on the first button, because the first child is not always a
           * button — an accepted answer puts a `Badge` there, and that badge's own inset needs the
           * same correction for the same reason.
           */}
          <div className="-ml-2.5 flex flex-wrap items-center gap-1">
            {/* Marked before the buttons: on a resolved question this is the first thing a
                reader is looking for. */}
            {isAcceptedAnswer && (
              <Badge dot variant="success">
                {t('post.qna.acceptedAnswer')}
              </Badge>
            )}

            {edited && <DeveloperMeta>{t('post.comments.edited')}</DeveloperMeta>}

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
             * THE LIKE CONTROL, BUILT AHEAD OF ITS BACKEND AND DISABLED ON PURPOSE.
             *
             * The owner asked for it now, knowing the endpoint does not exist — it is **B14** in
             * `docs/backend-plan.md`: `CommentResponseDto` carries no `likeCount`, and
             * `CommentController` has no reaction route, so there is nothing to send a like to and
             * nothing to read a total from.
             *
             * SO IT IS `disabled`, NOT WIRED TO A NO-OP. A button that depresses, thanks you, and
             * forgets is worse than no button: the reader believes a thing happened that did not,
             * and finds out only when they come back and their like is gone. Disabled with a title
             * that says why is the honest version of "coming soon", and it puts the layout in
             * place so the day B14 lands this is a one-line change — swap `disabled` for the
             * mutation and print `comment.likeCount` beside it.
             */}
            <Button
              size="sm"
              variant="ghost"
              icon={<ThumbsUp />}
              disabled
              title={t('post.comments.likeUnavailable')}
            >
              {t('post.comments.like')}
            </Button>

            {onReply && (
              <Button size="sm" variant="ghost" onClick={() => onReply(comment.id)}>
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
