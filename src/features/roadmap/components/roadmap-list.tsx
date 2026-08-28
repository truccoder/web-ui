'use client';

import { useState } from 'react';
import { Badge, Card, EmptyState, Select, Skeleton } from '@/shared/components';
import { useT } from '@/core/i18n';
import { getErrorMessage } from '@/shared/lib/api-error';
import { cn } from '@/shared/lib/cn';
import type { LearningCategory } from '../types/roadmap';
import { LEARNING_CATEGORIES } from '../lib/categories';
import { useRoadmaps } from '../hooks/use-roadmap';

/**
 * The list of learning tracks — the entry point to this domain.
 *
 * SELECTION LIVES IN THE CALLER, not here. Which roadmap is open is route state at 2d, and a
 * component that owned it would fight the URL. So this takes the selected id and reports clicks,
 * the same split `CommentThread` uses for its open/closed state.
 *
 * A TOPIC FILTER, WHICH THIS COMPONENT COULD NOT HAVE HAD. The note that stood here said
 * `RoadmapEntity` had three columns — id, name, description — and no domain of any kind, so
 * grouping tracks would have meant assigning them to domains the backend had never heard of
 * (ds-deviation #23). V76 gave it `category`, and V79 labelled the five seeded tracks, so the
 * deviation is closed.
 *
 * FILTERED, NOT GROUPED, and that is a smaller thing than the design system's
 * `skill-taxonomy.html` asks for. Grouping would put every topic on screen at once under its own
 * heading, which is worth doing over dozens of tracks and is theatre over five — four of the
 * headings would carry one card each. One control that narrows the list says the same thing at
 * this size and keeps the grid whole; grouping is the change to make when the catalogue is large
 * enough to need it.
 *
 * CLIENT-SIDE, because `GET /roadmaps` takes no `category` parameter and returns every track in
 * one unpaginated response. The list being filtered is the complete list, so nothing can hide
 * behind a page boundary — the property that makes this safe here and unsafe on the book
 * catalogue.
 */
export interface RoadmapListProps {
  /** The roadmap currently open, if any. */
  selectedId?: number;
  onSelect: (roadmapId: number) => void;
  className?: string;
}

export function RoadmapList({ selectedId, onSelect, className }: RoadmapListProps) {
  const t = useT();
  const roadmaps = useRoadmaps();
  const [category, setCategory] = useState<LearningCategory | undefined>(undefined);

  if (roadmaps.isLoading) {
    return (
      <div className={cn('flex flex-col gap-2', className)}>
        <Skeleton lines={2} />
        <Skeleton lines={2} />
      </div>
    );
  }

  if (roadmaps.isError) {
    return (
      <EmptyState
        className={className}
        title={t('roadmap.list.loadFailed')}
        description={getErrorMessage(roadmaps.error)}
      />
    );
  }

  const all = roadmaps.data ?? [];

  if (all.length === 0) {
    // Says only that there are none, not "an admin has not made any yet" — a reader cannot act on
    // that and it advertises a surface most of them will never be shown. No filter is rendered
    // over it either: with no tracks at all, a topic control offers nine ways to reach the same
    // empty page.
    return (
      <EmptyState
        className={className}
        title={t('roadmap.list.empty')}
        description={t('roadmap.list.emptyDesc')}
      />
    );
  }

  const visible =
    category === undefined ? all : all.filter((roadmap) => roadmap.category === category);

  return (
    <div className={cn('flex flex-col gap-[var(--nx-space-group)]', className)}>
      <Select
        size="sm"
        wrapperClassName="w-fit"
        aria-label={t('roadmap.list.categoryLabel')}
        value={category ?? ''}
        onChange={(event) =>
          setCategory((event.target.value || undefined) as LearningCategory | undefined)
        }
        options={[
          { value: '', label: t('roadmap.list.allCategories') },
          ...LEARNING_CATEGORIES.map((option) => ({
            value: option,
            label: t(`learningCategory.${option}`),
          })),
        ]}
      />

      {visible.length === 0 ? (
        <EmptyState
          compact
          title={t('roadmap.list.emptyCategory')}
          description={t('roadmap.list.emptyCategoryDesc')}
        />
      ) : (
        /**
         * TWO-UP GRID, matching the kit's roadmap index: 330-wide cards, two to the 672 measure.
         * Same `auto-fit minmax` mechanism as the library, and the same reason — a track is a short
         * title plus one line of description, so a full-measure row per track was mostly empty band.
         *
         * WHAT THE KIT HAS AND THIS DOES NOT: the index is split into `Đang theo` and `Khám phá thêm`,
         * and each card carries a progress row. Both need to know which roadmap a progress row belongs
         * to, and `RoadmapProgressDto` carries `nodeId`/`nodeName` with **no `roadmapId`** — the only
         * way to map back is to fetch every roadmap's nodes and search them, one request per track.
         * That is an N+1 over the catalogue to render a heading, so the split waits for the field.
         */
        <ul className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-3">
          {visible.map((roadmap) => (
            <li key={roadmap.id}>
              <Card
                interactive
                selected={roadmap.id === selectedId}
                padding={12}
                className="h-full w-full"
                // A card is a div, so the click target has to be a real button for the keyboard to
                // reach it — the card carries the appearance, the button carries the behaviour.
              >
                <button
                  type="button"
                  aria-pressed={roadmap.id === selectedId}
                  onClick={() => onSelect(roadmap.id)}
                  className="flex w-full flex-col gap-0.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring"
                >
                  <span className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-nx-ui font-medium text-nx-text-primary">
                      {roadmap.name}
                    </span>
                    {/* ON THE CARD AS WELL AS IN THE FILTER, because the filter says what you
                        asked for and the badge says what each track IS — which is the half a
                        reader browsing `Tất cả` needs. Hidden for `OTHER`: it is a real choice in
                        the dropdown, where it collects every unlabelled track, but as a badge it
                        would print "Khác" on a card and tell the reader nothing. */}
                    {roadmap.category !== 'OTHER' && (
                      <Badge>{t(`learningCategory.${roadmap.category}`)}</Badge>
                    )}
                  </span>
                  {roadmap.description && (
                    <span className="line-clamp-2 text-nx-body-sm text-nx-text-secondary">
                      {roadmap.description}
                    </span>
                  )}
                </button>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
