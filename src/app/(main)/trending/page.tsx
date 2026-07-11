'use client';

import { TrendingList } from '@/components/trending/trending-list';
import { useT } from '@/lib/i18n';

export default function TrendingPage() {
  const t = useT();

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('trending.title')}</h1>
        <p className="text-muted-foreground text-sm mt-0.5">{t('trending.subtitle')}</p>
      </div>

      <TrendingList />
    </div>
  );
}
