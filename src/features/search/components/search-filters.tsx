'use client';

import { Select } from '@/shared/components';
import { useT } from '@/core/i18n';
import { LEARNING_CATEGORIES, type LearningCategory } from '@/features/roadmap';
import type { SearchPostKind } from '../lib/post-kind';
import type { SearchTab } from '../lib/tabs';

/**
 * The filter row under the tab strip. One `Select` per tab, `RoadmapList`'s pattern — a control
 * that narrows a list it did not fetch, held in the parent's `useState` rather than the URL.
 *
 * `all` renders nothing: it is the overview, and a filter there would have to mean five different
 * things at once.
 */

export type SortMode = 'relevance' | 'rep';
export type PriceMode = 'all' | 'free' | 'paid';
export type ProjectStatusMode = 'all' | 'OPEN' | 'CLOSED' | 'COMPLETED';

export interface SearchFiltersState {
  peopleSort: SortMode;
  postKind: SearchPostKind | 'all';
  bookPrice: PriceMode;
  projectStatus: ProjectStatusMode;
  roadmapCategory: LearningCategory | 'all';
}

export const DEFAULT_FILTERS: SearchFiltersState = {
  peopleSort: 'relevance',
  postKind: 'all',
  bookPrice: 'all',
  projectStatus: 'all',
  roadmapCategory: 'all',
};

export interface SearchFiltersProps {
  tab: SearchTab;
  /** The post kinds actually present in the result set — the type filter offers only these. */
  postKinds: SearchPostKind[];
  value: SearchFiltersState;
  onChange: (next: SearchFiltersState) => void;
}

export function SearchFilters({ tab, postKinds, value, onChange }: SearchFiltersProps) {
  const t = useT();
  const set = <K extends keyof SearchFiltersState>(key: K, next: SearchFiltersState[K]) =>
    onChange({ ...value, [key]: next });

  if (tab === 'all') return null;

  return (
    <div className="flex flex-wrap gap-[var(--nx-space-pair)]">
      {tab === 'people' && (
        <Select
          size="sm"
          wrapperClassName="w-fit"
          aria-label={t('search.filters.sortLabel')}
          value={value.peopleSort}
          onChange={(e) => set('peopleSort', e.target.value as SortMode)}
          options={[
            { value: 'relevance', label: t('search.filters.sortRelevance') },
            { value: 'rep', label: t('search.filters.sortRep') },
          ]}
        />
      )}

      {tab === 'posts' && postKinds.length > 1 && (
        <Select
          size="sm"
          wrapperClassName="w-fit"
          aria-label={t('search.filters.kindLabel')}
          value={value.postKind}
          onChange={(e) => set('postKind', e.target.value as SearchPostKind | 'all')}
          options={[
            { value: 'all', label: t('search.filters.kindAll') },
            ...postKinds.map((kind) => ({ value: kind, label: t(`createPost.type.${kind}`) })),
          ]}
        />
      )}

      {tab === 'books' && (
        <Select
          size="sm"
          wrapperClassName="w-fit"
          aria-label={t('search.filters.priceLabel')}
          value={value.bookPrice}
          onChange={(e) => set('bookPrice', e.target.value as PriceMode)}
          options={[
            { value: 'all', label: t('search.filters.priceAll') },
            { value: 'free', label: t('search.filters.priceFree') },
            { value: 'paid', label: t('search.filters.pricePaid') },
          ]}
        />
      )}

      {tab === 'projects' && (
        <Select
          size="sm"
          wrapperClassName="w-fit"
          aria-label={t('search.filters.statusLabel')}
          value={value.projectStatus}
          onChange={(e) => set('projectStatus', e.target.value as ProjectStatusMode)}
          options={[
            { value: 'all', label: t('search.filters.statusAll') },
            { value: 'OPEN', label: t('projects.status.OPEN') },
            { value: 'CLOSED', label: t('projects.status.CLOSED') },
            { value: 'COMPLETED', label: t('projects.status.COMPLETED') },
          ]}
        />
      )}

      {tab === 'roadmaps' && (
        <Select
          size="sm"
          wrapperClassName="w-fit"
          aria-label={t('search.filters.categoryLabel')}
          value={value.roadmapCategory}
          onChange={(e) =>
            set('roadmapCategory', (e.target.value || 'all') as LearningCategory | 'all')
          }
          options={[
            { value: 'all', label: t('search.filters.categoryAll') },
            ...LEARNING_CATEGORIES.map((c) => ({ value: c, label: t(`learningCategory.${c}`) })),
          ]}
        />
      )}
    </div>
  );
}
