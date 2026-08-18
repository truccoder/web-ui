'use client';

import { useState } from 'react';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Button, Dialog, IconButton, Menu } from '@/shared/components';
import { getErrorMessage } from '@/shared/lib/api-error';
import { cn } from '@/shared/lib/cn';
import { useT } from '@/core/i18n';
import { useDeletePost } from '../hooks/use-post';

/**
 * The author's controls on their own post — fills `PostCard`'s `menu` slot.
 *
 * A `Menu` BEHIND A ⋯ TRIGGER, NOT TWO BARE BUTTONS. The previous version rendered `Sửa` and
 * `Xoá` as visible ghost buttons, and its own comment explained why: "the design system has no
 * popover/floating-panel spec". **That reason expired.** `shared/components/Menu` is a real
 * shipped primitive — the app shell uses it for the account dropdown and the composer uses it for
 * the post-kind switcher — so the trade it declined is no longer a trade.
 *
 * TWO THINGS THE CHANGE BUYS:
 *
 *  1. IT STOPS A DESTRUCTIVE VERB SITTING ONE MIS-TAP FROM THE TIMESTAMP. On a card the top-right
 *     read `11 giờ trước · Sửa · Xoá`, three targets in a row where two are chrome and one
 *     deletes a post. The design system's rule (r13 §5) is that a card surfaces its PRIMARY verbs
 *     and the menu holds what is secondary, rare or destructive. Edit and delete are all three.
 *  2. IT GIVES EVERY CARD THE SAME TOP-RIGHT SHAPE. Before, a post you wrote was visibly wider in
 *     the header than a post you did not, so a column of cards had a ragged right edge that
 *     tracked authorship rather than structure.
 *
 * DELETE CONFIRMS IN A `Dialog`, NOT INLINE. The inline two-step ("Xoá → chắc chứ? → Xoá") was
 * how this got by without a floating primitive; with one available, the destructive confirm
 * follows the shape the DS specifies for it (r12): the dialog names the object and the verb, the
 * cancel sits first, and the danger button repeats the verb rather than saying "OK".
 *
 * RENDER THIS ONLY FOR THE AUTHOR. The backend enforces it — `updatePost` and `deletePost` both
 * 403 for anyone else — but a button that always 403s is a lie in the UI, so the caller decides
 * by comparing the post's author id with the signed-in user.
 */
export interface PostMenuProps {
  postId: number;
  /** Opens the caller's edit surface; the menu does not own the form. */
  onEdit?: () => void;
  /**
   * Some kinds have no edit surface (a book post's file cannot be swapped), so the row can be
   * dropped without dropping the menu.
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
  const remove = useDeletePost({
    onSuccess: () => {
      setConfirming(false);
      onDeleted?.();
    },
  });

  return (
    <div className={cn('flex flex-col items-end gap-1', className)}>
      <Menu
        align="end"
        width={180}
        trigger={
          <IconButton label={t('post.edit.menuLabel')}>
            <MoreHorizontal />
          </IconButton>
        }
        items={[
          ...(canEdit
            ? [{ label: t('post.edit.edit'), icon: <Pencil />, onSelect: () => onEdit?.() }]
            : []),
          {
            label: t('post.edit.delete'),
            icon: <Trash2 />,
            danger: true,
            onSelect: () => {
              // Clear a previous failure so the dialog never opens already showing an error from
              // an attempt the reader has since forgotten about.
              remove.reset();
              setConfirming(true);
            },
          },
        ]}
      />

      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title={t('post.edit.deleteTitle')}
        description={t('post.edit.deleteDesc')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              {t('post.comments.cancel')}
            </Button>
            <Button
              variant="danger"
              loading={remove.isPending}
              onClick={() => remove.mutate(postId)}
            >
              {t('post.edit.delete')}
            </Button>
          </>
        }
      >
        {remove.error && (
          <p role="alert" className="text-nx-body-sm text-nx-status-danger-fg">
            {getErrorMessage(remove.error)}
          </p>
        )}
      </Dialog>
    </div>
  );
}
