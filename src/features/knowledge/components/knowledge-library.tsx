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
    /**
     * ONE `space-y-3` USED TO SERVE TWO DIFFERENT RELATIONSHIPS HERE, which is why no single
     * number could have been right. Its direct children are the filter row AND every
     * `ExplanationCard`, so 12 was being paid both for "a control block ↔ the content it filters"
     * and for "card ↔ card". They are different rungs: `group` 16 and `block` 20.
     *
     * The cards carry a full card inset (`16px 20px`), so at 12 the gap BETWEEN two of them was
     * smaller than the padding INSIDE one — the same proximity inversion `/newsfeed?tab=tech`
     * had, on a different screen. `adherence-r10` states it directly: *"a block ↔ block gap of 12
     * must become var(--nx-space-block)"*.
     *
     * SO THE COLUMN IS TWO COLUMNS NOW, one rung each, rather than one column carrying a number
     * that is a compromise between two answers. Outer: `group` 16, the filter row ↔ the list it
     * filters. Inner: `block` 20, card ↔ card. Nesting is the only way a flex column can hold two
     * different distances, and the alternative — picking whichever rung hurts less — is what
     * produced the 12.
     *
     * AND IT IS A `gap` NOW, NOT `space-y-*`. That part is not cosmetic: `space-y-*` sets margins
     * on the siblings, so the container's computed `rowGap` reads `normal` — invisible to the
     * ladder-measuring probe in `docs/ui-audit-plan.md` §03, and untouched by any future refit of
     * the ladder's values. `globals.css:604` makes the same argument about a stray literal: the
     * next refitting silently skips whatever did not declare a rung.
     *
     * See report §3.4 (D001, D002). `e2e/layout.spec.ts` asserts the 20.
     */
    <div className="flex flex-col gap-[var(--nx-space-group)]">
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
        <div className="flex flex-col gap-[var(--nx-space-block)]">
          {visible.map((explanation) => (
            <ExplanationCard
              key={explanation.id ?? explanation.postId}
              explanation={explanation}
              showSource
            />
          ))}
        </div>
      )}
    </div>
  );
}
