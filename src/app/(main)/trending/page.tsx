'use client';

import { TrendingList } from '@/features/trending';
import { useT } from '@/core/i18n';

/**
 * `/trending` — crawled items from around the web.
 *
 * The page is a heading and one feature component. Filters are the list's own state rather than
 * URL state; the reasoning is on `TrendingList`.
 */
export default function TrendingPage() {
  const t = useT();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div>
        <h1 className="text-nx-title font-semibold text-nx-text-primary">{t('trending.title')}</h1>
        <p className="mt-0.5 text-nx-body-sm text-nx-text-secondary">{t('trending.subtitle')}</p>
      </div>

      <TrendingList />
    </div>
  );
}
