'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { SearchResults } from '@/features/search';
import { useT } from '@/core/i18n';

/**
 * `/search` — results for the term in `?q=`.
 *
 * The page owns the URL and nothing else: no hook, no fetching, no knowledge of what a result
 * looks like. The term is the whole input, and `features/search` does the rest.
 */
export default function SearchPage() {
  return (
    <Suspense>
      <SearchContent />
    </Suspense>
  );
}

function SearchContent() {
  const t = useT();
  const searchParams = useSearchParams();
  const query = (searchParams.get('q') ?? '').trim();

  return (
    <div className="flex flex-col gap-[var(--nx-space-section)]">
      <div>
        <h1 className="text-nx-title font-semibold text-nx-text-primary">{t('search.title')}</h1>
        {query && (
          <p className="mt-0.5 text-nx-body-sm text-nx-text-secondary">
            {t('search.resultsFor', { query })}
          </p>
        )}
      </div>

      <SearchResults query={query} />
    </div>
  );
}
