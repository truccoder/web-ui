'use client';

import Link from 'next/link';
import { Badge } from '@/shared/components';
import { useT } from '@/core/i18n';
import { cn } from '@/shared/lib/cn';
import type { Roadmap } from '@/features/roadmap';

/**
 * One learning track in the results.
 *
 * Links to `/roadmap?id={id}` — the shape `roadmap/page.tsx` reads to open a track in focus
 * mode. The category badge is hidden for `OTHER` for the same reason `RoadmapList` hides it:
 * as a chip it would print "Khác" and say nothing.
 */
export interface RoadmapResultCardProps {
  roadmap: Roadmap;
  className?: string;
}

export function RoadmapResultCard({ roadmap, className }: RoadmapResultCardProps) {
  const t = useT();

  return (
    <Link
      href={`/roadmap?id=${roadmap.id}`}
      className={cn(
        'flex flex-col gap-0.5 px-3 py-3',
        'rounded-nx-sm hover:bg-nx-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring',
        className
      )}
    >
      <span className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-nx-ui font-medium text-nx-text-primary">
          {roadmap.name}
        </span>
        {roadmap.category !== 'OTHER' && <Badge>{t(`learningCategory.${roadmap.category}`)}</Badge>}
      </span>
      {roadmap.description && (
        <span className="line-clamp-2 text-nx-body-sm text-nx-text-secondary">
          {roadmap.description}
        </span>
      )}
    </Link>
  );
}
