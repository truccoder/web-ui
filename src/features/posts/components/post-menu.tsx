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
   * Hides the edit button, leaving delete.
   *
   * WHY IT SURVIVED THE REASON IT WAS BORN FOR. Added at P2.4'd because the newsfeed payload
   * did not echo the six details blocks, so editing a CODE_SNIPPET/ARTICLE/QNA/POLL/LINK post
   * from the feed sent nulls back through `BeanUtils.copyProperties` and destroyed the block
   * that defines it. The backend fixed `fanOutPost` (BE 28–29/07) and the blocks now arrive
   * populated — measured on the live feed at F-A: CODE_SNIPPET 2/2, QNA 1/1, BOOK 1/1 non-null
   * — so no caller passes `false` for that reason any more.
   *
   * The prop stays because it is not about that defect: it says "this caller cannot supply the
   * state an edit would need", which is a sentence any future surface may need to say. What was
   * wrong was the *reason* being passed into it, not the switch itself.
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
