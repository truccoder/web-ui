'use client';

import { FriendRequests } from '@/features/friendships';
import { useT } from '@/core/i18n';

export default function FriendRequestsPage() {
  const t = useT();
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-nx-title font-semibold tracking-tight text-nx-text-primary">
          {t('friends.requests.title')}
        </h1>
        <p className="mt-1 text-nx-body-sm text-nx-text-muted">{t('friends.requests.subtitle')}</p>
      </div>

      <FriendRequests />
    </div>
  );
}
