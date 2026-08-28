'use client';

import * as React from 'react';
import { EmptyState, Select, Skeleton } from '@/shared/components';
import { getErrorMessage } from '@/shared/lib/api-error';
import { useT } from '@/core/i18n';
import type { LearningCategory } from '../types/knowledge';
import { useKnowledgeLibrary } from '../hooks';
import { ExplanationCard } from './explanation-card';

/**
 * The nine topics, in the backend enum's own order — see the identical list in `BookLibrary` and
 * the note on `bookstore`'s `LearningCategory` for why the array is repeated per feature rather
 * than lifted somewhere shared. "Every topic" is the absence of a filter, not a tenth value.
 */
const CATEGORIES: LearningCategory[] = [
  'BACKEND',
  'FRONTEND',
  'MOBILE',
  'DEVOPS',
  'DATA_ML',
  'SECURITY',
  'QA',
  'CAREER',
  'OTHER',
];

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
 *
 * THE TOPIC FILTER RUNS HERE, IN THE BROWSER, UNLIKE THE LIBRARY'S — and that is the backend's
 * shape rather than a choice. `GET /knowledge/my-library` takes no `category` parameter; it
 * carries the field on each row and returns the whole list in one response. With no paging there
 * is nothing for client-side filtering to get wrong: the list being filtered IS the complete list,
 * which is precisely what makes the same approach unsafe on the cursor-paged catalogue. If this
 * endpoint ever grows a cursor, the filter has to move to the server in the same change.
 */
export function KnowledgeLibrary() {
  const t = useT();
  const { data, isPending, isError, error } = useKnowledgeLibrary();
  const [category, setCategory] = React.useState<LearningCategory | undefined>(undefined);

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

  /**
   * THE EMPTY VAULT STILL RETURNS EARLY, unlike the catalogue's empty state.
   *
   * The difference is what the reader can do about it. An empty topic on a shelf that HAS books is
   * a filter to change, so the filter must stay on screen; an empty vault has nothing to filter,
   * and a topic dropdown over it would be a control with nine choices that all lead to the same
   * blank page.
   */
  if (data.totalCount === 0) {
    return (
      <EmptyState
        title={t('knowledge.library.emptyTitle')}
        description={t('knowledge.library.emptyDesc')}
      />
    );
  }

  const visible =
    category === undefined
      ? data.explanations
      : data.explanations.filter((explanation) => explanation.category === category);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* THE COUNT IS OF WHAT IS ON SCREEN, and it says so against the total when a topic is
            picked. "12 bản giải thích" over a filtered list of three would be a number about a
            list the reader is not looking at. */}
        <p className="text-nx-caption text-nx-text-muted">
          {category === undefined
            ? t('knowledge.library.count', { count: data.totalCount })
            : t('knowledge.library.countFiltered', {
                count: visible.length,
                total: data.totalCount,
              })}
        </p>

        <Select
          size="sm"
          wrapperClassName="w-fit"
          aria-label={t('knowledge.library.categoryLabel')}
          value={category ?? ''}
          onChange={(event) =>
            setCategory((event.target.value || undefined) as LearningCategory | undefined)
          }
          options={[
            { value: '', label: t('knowledge.library.allCategories') },
            ...CATEGORIES.map((option) => ({
              value: option,
              label: t(`learningCategory.${option}`),
            })),
          ]}
        />
      </div>

      {visible.length === 0 ? (
        <EmptyState
          compact
          title={t('knowledge.library.emptyCategoryTitle')}
          description={t('knowledge.library.emptyCategoryDesc')}
        />
      ) : (
        visible.map((explanation) => (
          <ExplanationCard
            key={explanation.id ?? explanation.postId}
            explanation={explanation}
            showSource
          />
        ))
      )}
    </div>
  );
}
