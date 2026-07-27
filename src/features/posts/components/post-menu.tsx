'use client';

import { useState } from 'react';
import { Button } from '@/shared/components';
import { useT } from '@/lib/i18n';
import { getErrorMessage } from '@/shared/lib/api-error';
import { cn } from '@/shared/lib/cn';
import { useDeletePost } from '../hooks/use-post';

/**
 * The author's controls on their own post — fills `PostCard`'s `menu` slot.
 *
 * Inline buttons with a two-step delete confirm, not a dropdown: the design system has no
 * popover/floating-panel spec (Dialog, Menu, Tooltip and Toast only), and this is the third
 * place in the domain that would have wanted one. Building a floating primitive from a
 * guess, for two buttons, is the trade the reaction row and the comment delete both
 * declined.
 *
 * RENDER THIS ONLY FOR THE AUTHOR. The backend enforces it — `updatePost` and `deletePost`
 * both 403 for anyone else — but a button that always 403s is a lie in the UI, so the
 * caller decides by comparing the post's author id with the signed-in user.
 */
export interface PostMenuProps {
  postId: number;
  /** Opens the caller's edit surface; the menu does not own the form. */
  onEdit: () => void;
  /**
   * Hides the edit button, leaving delete. Added at P2.4'd for one specific and unhappy
   * reason: an edit sends the post's whole state back (`BeanUtils.copyProperties` copies
   * nulls), and the caller can only send back what its payload gave it. The newsfeed payload
   * does not carry `codeSnippetDetails`, `articleDetails`, `qnaDetails`, `pollDetails`,
   * `linkDetails` or `quizDetails` — `NewsfeedService.fanOutPost` never copies them onto
   * `FeedPostDataDto`, so they arrive null on every post — which means editing a post of one
   * of those kinds from the feed would destroy the block that defines it.
   *
   * So the caller turns the edit button off where it cannot supply the state, rather than
   * offering a control whose only possible outcome is data loss. Delete stays: it is
   * unambiguous and loses nothing that was not asked for. This prop should be removed once
   * the backend echoes those six fields.
   *
   * @default true
   */
  canEdit?: boolean;
  /** Lets the composing screen drop the post from its own list. */
  onDeleted?: () => void;
  className?: string;
}

export function PostMenu({ postId, onEdit, canEdit = true, onDeleted, className }: PostMenuProps) {
  const t = useT();
  const [confirming, setConfirming] = useState(false);
  const remove = useDeletePost({ onSuccess: () => onDeleted?.() });

  return (
    <div className={cn('flex flex-col items-end gap-1', className)}>
      <div className="flex items-center gap-1">
        {confirming ? (
          <>
            <span className="text-nx-micro text-nx-status-danger-fg">
              {t('post.edit.deleteConfirm')}
            </span>
            <Button
              size="sm"
              variant="danger"
              loading={remove.isPending}
              onClick={() => remove.mutate(postId)}
            >
              {t('post.edit.delete')}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
              {t('post.comments.cancel')}
            </Button>
          </>
        ) : (
          <>
            {canEdit && (
              <Button size="sm" variant="ghost" onClick={onEdit}>
                {t('post.edit.edit')}
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => setConfirming(true)}>
              {t('post.edit.delete')}
            </Button>
          </>
        )}
      </div>

      {remove.error && (
        <p role="status" className="text-nx-micro text-nx-status-danger-fg">
          {getErrorMessage(remove.error)}
        </p>
      )}
    </div>
  );
}
