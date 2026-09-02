'use client';

import Link from 'next/link';
import { Badge, Card } from '@/shared/components';
import { useT } from '@/core/i18n';
import { cn } from '@/shared/lib/cn';
import type { Roadmap } from '@/features/roadmap';
import { withBackTo } from '../lib/search-return';

/**
 * One learning track in the results — the same `Card` the roadmap index draws (`RoadmapList`),
 * not the bespoke row this used to be. The owner's note was "dùng style có sẵn … thay vì random".
 *
 * Links to `/roadmap?id={id}` — the shape `roadmap/page.tsx` reads to open a track's detail view —
 * with `?backTo=` so that view's back link leads to these results, not the roadmap index.
 * `RoadmapList` uses a button + `onSelect` because selection there is route state it owns; here a
 * plain link is right. The category badge is hidden for `OTHER` for the same reason it is there:
 * as a chip it would print "Khác" and say nothing.
 */
export interface RoadmapResultCardProps {
  roadmap: Roadmap;
  /** The results URL to send the reader back to from the track's back link. */
  backTo: string;
  className?: string;
}

export function RoadmapResultCard({ roadmap, backTo, className }: RoadmapResultCardProps) {
  const t = useT();

  return (
    <Card interactive padding={12} className={cn('h-full', className)}>
      <Link
        href={withBackTo(`/roadmap?id=${roadmap.id}`, backTo)}
        className="flex w-full flex-col gap-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring"
      >
        <span className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-nx-ui font-medium text-nx-text-primary">
            {roadmap.name}
          </span>
          {roadmap.category !== 'OTHER' && (
            <Badge>{t(`learningCategory.${roadmap.category}`)}</Badge>
          )}
        </span>
        {roadmap.description && (
          <span className="line-clamp-2 text-nx-body-sm text-nx-text-secondary">
            {roadmap.description}
          </span>
        )}
      </Link>
    </Card>
  );
}
