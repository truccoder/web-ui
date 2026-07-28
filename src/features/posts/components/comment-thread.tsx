'use client';

import { useState } from 'react';
import { EmptyState, Skeleton } from '@/shared/components';
import { useMyProfile } from '@/features/security';
import { useT } from '@/lib/i18n';
import { getErrorMessage } from '@/shared/lib/api-error';
import { cn } from '@/shared/lib/cn';
import {
  groupComments,
  useComments,
  useCreateComment,
  useDeleteComment,
  useUpdateComment,
} from '../hooks/use-comment';
import { useAcceptAnswer } from '../hooks/use-post';
import { CommentComposer } from './comment-composer';
import { CommentItem } from './comment-item';

/**
 * The comment thread for one post — fills `PostCard`'s `actions` slot.
 *
 * TWO LEVELS, AND THE UI ADMITS IT. `CommentService.validateParentComment` rejects a reply
 * whose parent is itself a reply, so "Reply" is offered on top-level comments only. The
 * alternative — offering it everywhere and silently re-pointing the parent at the thread
 * root — would put the new reply somewhere other than under the comment the user answered,
 * which is worse than not offering it.
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

  const [replyingTo, setReplyingTo] = useState<number | null>(null);

  /**
   * The comment accepted during this mounting, if any.
   *
   * THIS EXISTS BECAUSE THE ANSWER CANNOT BE READ BACK. `acceptedAnswerId` reaches this
   * component through the post payload, and the newsfeed payload never carries `qnaDetails` —
   * `NewsfeedService.fanOutPost` does not copy it onto `FeedPostDataDto`. Measured in the feed
   * at P2.4'd: accepting an answer set `acceptedAnswerId` in the database and the prop still
   * arrived undefined, so the control stayed on every comment and a second click was a silent
   * 400 ("An answer has already been accepted for this post").
   *
   * This is not the invented read-model that `SessionComment` was — the accept really did
   * happen and really is stored; the frontend simply has no endpoint that reports it back. So
   * remembering it here is honest about this session and wrong about nothing, and a reload
   * still shows the control again until the backend echoes the field. Delete this state, and
   * keep the prop, once it does.
   */
  const [acceptedInSession, setAcceptedInSession] = useState<number | null>(null);

  const comments = useComments(postId);
  const notify = { onSuccess: () => onChanged?.() };
  const create = useCreateComment(notify);
  const update = useUpdateComment(notify);
  const remove = useDeleteComment(notify);
  // `useAcceptAnswer` already invalidates `postKeys.comments(postId)` itself — it was written
  // that way in cycle 1, before this query existed. `onChanged` is still needed on top,
  // because the post's own `qnaDetails.isResolved` lives in the feed payload, not here.
  const accept = useAcceptAnswer({
    onSuccess: (_data, variables) => {
      setAcceptedInSession(variables.commentId);
      onChanged?.();
    },
  });

  // ACCEPTING IS ONCE-ONLY. `acceptAnswer` throws "An answer has already been accepted for
  // this post" when `acceptedAnswerId` is set, and there is no endpoint to un-accept or
  // re-assign. So the control disappears from EVERY comment the moment one is chosen —
  // leaving it on the others would be a button whose only outcome is a 400.
  //
  // The payload's answer wins over the session's: once the backend does echo `qnaDetails`,
  // the prop is the durable truth and this falls back to it without a second code path.
  const acceptedId = acceptedAnswerId ?? acceptedInSession;

  const acceptHandler =
    canAcceptAnswer && acceptedId == null
      ? (commentId: number) => accept.mutate({ postId, commentId })
      : undefined;

  const thread = groupComments(comments.data ?? []);
  const mutationError = create.error ?? update.error ?? remove.error;

  // Which single row is mid-flight, so only that row shows a spinner. `update`/`remove`
  // carry the id in their variables; `create` has no row yet.
  const pendingCommentId =
    (update.isPending ? update.variables?.commentId : undefined) ??
    (remove.isPending ? remove.variables?.commentId : undefined) ??
    null;

  if (comments.isLoading) {
    return (
      <div className={cn('flex flex-col gap-3', className)}>
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
    <div className={cn('flex flex-col gap-4', className)}>
      {thread.length === 0 ? (
        <EmptyState compact title={t('post.comments.empty')} />
      ) : (
        <ul className="flex flex-col gap-4">
          {thread.map((root) => (
            <li key={root.id} className="flex flex-col gap-3">
              <CommentItem
                comment={root}
                replies={root.replies}
                currentUserId={profile.data?.id}
                onReply={(parentId) => setReplyingTo(parentId)}
                onAcceptAnswer={acceptHandler}
                isAcceptedAnswer={acceptedId === root.id}
                onEdit={(commentId, content) =>
                  update.mutate({ postId, commentId, payload: { content } })
                }
                onDelete={(commentId) => remove.mutate({ postId, commentId })}
                pendingCommentId={pendingCommentId}
                editError={update.error ? getErrorMessage(update.error) : null}
              />

              {root.replies.length > 0 && (
                // Indent is the only thing marking a reply, and it stops at one level
                // because the data does.
                <ul className="flex flex-col gap-3 border-l border-nx-border-subtle pl-3">
                  {root.replies.map((reply) => (
                    <li key={reply.id}>
                      <CommentItem
                        comment={reply}
                        currentUserId={profile.data?.id}
                        onAcceptAnswer={acceptHandler}
                        isAcceptedAnswer={acceptedId === reply.id}
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

              {replyingTo === root.id && (
                <CommentComposer
                  className="pl-3"
                  placeholder={t('post.comments.replyPlaceholder')}
                  submitLabel={t('post.comments.reply')}
                  onCancel={() => setReplyingTo(null)}
                  onSubmit={(content) => {
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

      {/* `key` is the reset: a confirmed write changes it, React remounts an empty box, and
          nothing calls setState from an effect to get there. `submittedAt` moves on every
          attempt but is only read once the attempt SUCCEEDED, so a rejected comment keeps
          the user's draft. */}
      <CommentComposer
        key={create.isSuccess ? create.submittedAt : 'draft'}
        onSubmit={(content) => create.mutate({ postId, payload: { content } })}
        pending={create.isPending && replyingTo === null}
        error={create.error ? getErrorMessage(create.error) : null}
      />

      {/* Delete has no box of its own to report into, so its failure surfaces here. */}
      {remove.error && mutationError === remove.error && (
        <p role="status" className="text-nx-micro text-nx-status-danger-fg">
          {getErrorMessage(remove.error)}
        </p>
      )}
    </div>
  );
}
