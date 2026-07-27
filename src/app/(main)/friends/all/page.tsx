'use client';

import { FriendsList } from '@/features/friendships';
import { useT } from '@/lib/i18n';

export default function AllFriendsPage() {
  const t = useT();
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-nx-title font-semibold tracking-tight text-nx-text-primary">
        {t('friends.all.title')}
      </h1>

      <FriendsList />
    </div>
  );
}
