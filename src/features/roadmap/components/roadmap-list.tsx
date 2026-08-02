'use client';

import { Card, EmptyState, Skeleton } from '@/shared/components';
import { useT } from '@/core/i18n';
import { getErrorMessage } from '@/shared/lib/api-error';
import { cn } from '@/shared/lib/cn';
import { useRoadmaps } from '../hooks/use-roadmap';

/**
 * The list of learning tracks — the entry point to this domain.
 *
 * SELECTION LIVES IN THE CALLER, not here. Which roadmap is open is route state at 2d, and a
 * component that owned it would fight the URL. So this takes the selected id and reports clicks,
 * the same split `CommentThread` uses for its open/closed state.
 *
 * NO DOMAIN GROUPING, THOUGH THE DESIGN SYSTEM SHOWS IT. `guidelines/skill-taxonomy.html` groups
 * skills under a fixed taxonomy of eight domains (Backend, Frontend, DevOps, Mobile, AI/ML,
 * Security, Cloud, Data) and says domains "drive search facets, roadmap grouping, matchmaking".
 * `RoadmapEntity` has three columns — id, name, description — and no domain of any kind, so
 * grouping would mean assigning tracks to domains the backend has never heard of. Flat list, and
 * ds-deviation #23 records why.
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

  if ((roadmaps.data?.length ?? 0) === 0) {
    // Says only that there are none, not "an admin has not made any yet" — a reader cannot act on
    // that and it advertises a surface most of them will never be shown.
    return <EmptyState className={className} title={t('roadmap.list.empty')} />;
  }

  return (
    <ul className={cn('flex flex-col gap-2', className)}>
      {roadmaps.data?.map((roadmap) => (
        <li key={roadmap.id}>
          <Card
            interactive
            selected={roadmap.id === selectedId}
            padding={12}
            className="w-full"
            // A card is a div, so the click target has to be a real button for the keyboard to
            // reach it — the card carries the appearance, the button carries the behaviour.
          >
            <button
              type="button"
              aria-pressed={roadmap.id === selectedId}
              onClick={() => onSelect(roadmap.id)}
              className="flex w-full flex-col gap-0.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring"
            >
              <span className="text-nx-ui font-medium text-nx-text-primary">{roadmap.name}</span>
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
  );
}
