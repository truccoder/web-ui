'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { SearchResults } from '@/features/search';

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
  const searchParams = useSearchParams();
  const query = (searchParams.get('q') ?? '').trim();

  return (
    <div className="flex flex-col gap-[var(--nx-space-section)]">
      <SearchResults query={query} />
    </div>
  );
}
