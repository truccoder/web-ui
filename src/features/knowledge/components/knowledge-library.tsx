'use client';

import * as React from 'react';
import { EmptyState, Skeleton } from '@/shared/components';
import { getErrorMessage } from '@/shared/lib/api-error';
import { useT } from '@/core/i18n';
import { useKnowledgeLibrary } from '../hooks';
import { ExplanationCard } from './explanation-card';

/**
 * Everything the user has chosen to keep.
 *
 * UNPAGINATED — the endpoint returns the whole list with a `totalCount` and no cursor, so there is
 * nothing to page through. Fine at present volumes; a ceiling to remember rather than to work
 * around here.
 *
 * `totalCount === 0` is the empty test: the backend returns `{ explanations: [], totalCount: 0 }`
 * rather than a 404 for an empty library (measured).
 *
 * THE SAME POST CAN APPEAR SEVERAL TIMES. Saving is versioned — `findMaxVersion + 1` — so asking
 * for a second explanation of a post and keeping it adds a row instead of replacing one. The cards
 * show their version for exactly that reason; grouping by post would hide that the newest answer
 * is not the only one.
 */
export function KnowledgeLibrary() {
  const t = useT();
  const { data, isPending, isError, error } = useKnowledgeLibrary();

  if (isPending) {
    return (
      <div className="space-y-3">
        <Skeleton lines={4} />
        <Skeleton lines={4} />
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-nx-caption text-nx-status-danger-fg">
        {getErrorMessage(error, t('knowledge.library.loadError'))}
      </p>
    );
  }

  if (data.totalCount === 0) {
    return (
      <EmptyState
        title={t('knowledge.library.emptyTitle')}
        description={t('knowledge.library.emptyDesc')}
      />
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-nx-caption text-nx-text-muted">
        {t('knowledge.library.count', { count: data.totalCount })}
      </p>
      {data.explanations.map((explanation) => (
        <ExplanationCard
          key={explanation.id ?? explanation.postId}
          explanation={explanation}
          showSource
        />
      ))}
    </div>
  );
}
