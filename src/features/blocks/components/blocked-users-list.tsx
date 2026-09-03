'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Avatar, Button, Dialog, EmptyState, Skeleton, toast } from '@/shared/components';
import { getErrorMessage } from '@/shared/lib/api-error';
import { useT } from '@/core/i18n';
import type { BlockedUser } from '../types/block';
import { useBlockedUsers, useBlockUser, useUnblockUser } from '../hooks/use-block';

/**
 * Everyone the signed-in account has blocked, and the one control that undoes it.
 *
 * WHY THIS LIST HAS TO EXIST WHEREVER BLOCKING DOES. A block is invisible by design: the other
 * person is removed from your feed, your search and your friends, and nothing anywhere says so.
 * That is correct for them and dangerous for you — without a list, a block made once is a
 * permanent, unreviewable edit to what the product shows you. This is the only surface that can
 * answer "who am I not seeing, and why is my feed like this".
 *
 * UNBLOCKING IS NOT BEHIND A CONFIRM, unlike unfriending. The asymmetry is deliberate: blocking is
 * the destructive direction (it tears down a friendship), and unblocking only restores visibility.
 * A misclick here shows you someone's posts again, which the next click can undo.
 *
 * IT DOES NOT RENDER `eliteScore`, though the payload carries it. A reputation chip beside someone
 * you blocked is the product arguing with your decision.
 */
export function BlockedUsersList() {
  const t = useT();
  const { data: blocked, isPending, isError, error } = useBlockedUsers();
  const unblock = useUnblockUser();

  if (isPending) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton lines={2} />
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-nx-caption text-nx-status-danger-fg">
        {getErrorMessage(error, t('blocks.loadError'))}
      </p>
    );
  }

  if (blocked.length === 0) {
    return (
      <EmptyState compact title={t('blocks.emptyTitle')} description={t('blocks.emptyDesc')} />
    );
  }

  return (
    <ul className="flex flex-col gap-4">
      {blocked.map((user) => (
        <li key={user.id}>
          <BlockedRow
            user={user}
            pending={unblock.isPending && unblock.variables === user.id}
            onUnblock={() =>
              user.id != null &&
              unblock.mutate(user.id, {
                onError: (error) => toast.error(getErrorMessage(error, t('blocks.unblockError'))),
              })
            }
          />
        </li>
      ))}
    </ul>
  );
}

function BlockedRow({
  user,
  pending,
  onUnblock,
}: {
  user: BlockedUser;
  pending: boolean;
  onUnblock: () => void;
}) {
  const t = useT();
  const name = user.fullName?.trim() || user.username || t('blocks.unknownUser');

  return (
    // Same row card as the friends tabs — white, radius 8, `12px 20px`, so the two lists of people
    // read as the same kind of object.
    <div className="flex items-center gap-3 rounded-nx-md bg-nx-surface-card px-5 py-3">
      {/* Blocked people still link: the profile is public either way, and being unable to reach
          it would leave a name with no way to check who it actually is. The avatar and the full
          name are the link's biggest targets, same as everywhere else identity is shown. */}
      {user.username ? (
        <Link
          href={`/u/${encodeURIComponent(user.username)}`}
          className="group flex min-w-0 flex-1 items-center gap-3 rounded-nx-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring"
        >
          <Avatar src={user.profilePictureUrl} name={name} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-nx-ui font-medium text-nx-text-primary group-hover:text-nx-text-link-hover">
              {name}
            </p>
            <span className="truncate font-mono text-nx-caption text-nx-text-muted">
              @{user.username}
            </span>
          </div>
        </Link>
      ) : (
        <>
          <Avatar src={user.profilePictureUrl} name={name} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-nx-ui font-medium text-nx-text-primary">{name}</p>
          </div>
        </>
      )}
      <Button size="sm" variant="secondary" loading={pending} onClick={onUnblock}>
        {t('blocks.unblock')}
      </Button>
    </div>
  );
}

/**
 * The block control itself, for a surface that is about one person — `/u/{username}`.
 *
 * IT IS BEHIND A CONFIRM AND THE CONFIRM SAYS WHAT IS LOST. Blocking is not a mute: the backend
 * deletes the friendship as part of it, so someone who blocks a friend to get some quiet loses the
 * friendship permanently and unblocking does not bring it back. A dialog that only asked "are you
 * sure" would be hiding the one consequence worth knowing.
 */
export interface BlockUserButtonProps {
  userId: number;
  name: string;
  className?: string;
}

export function BlockUserButton({ userId, name, className }: BlockUserButtonProps) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const block = useBlockUser();

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        className={className}
        onClick={() => {
          block.reset();
          setOpen(true);
        }}
      >
        {t('blocks.block')}
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={t('blocks.confirmTitle', { name })}
        description={t('blocks.confirmDesc', { name })}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t('blocks.cancel')}
            </Button>
            <Button
              variant="danger"
              loading={block.isPending}
              onClick={() => block.mutate(userId, { onSuccess: () => setOpen(false) })}
            >
              {t('blocks.block')}
            </Button>
          </>
        }
      >
        {block.isError && (
          <p role="alert" className="text-nx-body-sm text-nx-status-danger-fg">
            {getErrorMessage(block.error, t('blocks.blockError'))}
          </p>
        )}
      </Dialog>
    </>
  );
}
