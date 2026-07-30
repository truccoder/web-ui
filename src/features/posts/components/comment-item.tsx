'use client';

import { useState } from 'react';
import { Badge, Button, DeveloperIdentity, DeveloperMeta } from '@/shared/components';
import { useT } from '@/lib/i18n';
import { cn } from '@/shared/lib/cn';
import { formatDateTime, useIntlLocale } from '@/shared/lib/format';
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
  pendingCommentId,
  editError,
  className,
}: CommentItemProps) {
  const t = useT();
  const localeTag = useIntlLocale();
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const isAuthor = currentUserId !== undefined && comment.authorId === currentUserId;
  const pending = pendingCommentId === comment.id;
  const edited = comment.updatedAt !== comment.createdAt;
  const replyCount = replies?.length ?? 0;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <DeveloperIdentity
        size="sm"
        name={comment.authorFullName?.trim() || t('post.unknownAuthor')}
        src={comment.authorProfilePictureUrl ?? undefined}
        time={formatDateTime(comment.createdAt, localeTag) ?? undefined}
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
          <p className="whitespace-pre-wrap break-words text-nx-body-sm text-nx-text-primary">
            {comment.content}
          </p>

          <div className="flex flex-wrap items-center gap-1">
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
