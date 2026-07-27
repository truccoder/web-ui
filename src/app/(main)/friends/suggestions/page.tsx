'use client';

import { FriendSuggestions } from '@/features/friendships';
import { useT } from '@/lib/i18n';

export default function FriendSuggestionsPage() {
  const t = useT();
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-nx-title font-semibold tracking-tight text-nx-text-primary">
          {t('friends.suggestions.title')}
        </h1>
        <p className="mt-1 text-nx-body-sm text-nx-text-muted">
          {t('friends.suggestions.subtitle')}
        </p>
      </div>

      <FriendSuggestions />
    </div>
  );
}
