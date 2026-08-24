'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/shared/lib/cn';

/**
 * Previous / page-of / next, for a server-paginated list.
 *
 * IN `shared/` BECAUSE IT KNOWS NOTHING ABOUT ANY DOMAIN — it takes two numbers and a callback.
 * The legacy version lived in `components/moderation/`, which is why the second domain that
 * needed paging never found it. This is built now rather than speculatively because moderation is
 * the first real caller (CLAUDE.md Phase 1.3: a primitive invented ahead of a consumer is usually
 * the wrong shape).
 *
 * THE PAGE NUMBER IS 1-BASED, matching what the backend's list endpoints accept. Their responses
 * report a 0-based `number`, so a caller that drives this from the response has to add one — the
 * conversion belongs at that boundary, not in a component whose whole job is to say "page 3 of 7"
 * to a human who counts from one.
 *
 * RENDERS NOTHING FOR A SINGLE PAGE. Two permanently-disabled arrows around "1 / 1" is furniture
 * that tells the reader only that there is nothing to do.
 *
 * The label is passed in rather than translated here: `shared/` has no business owning a domain's
 * copy, and different lists word it differently.
 */
export interface PaginationProps {
  /** Current page, **1-based**. */
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /**
   * Disables both arrows while a page is in flight. Distinct from being at an edge — the arrow
   * is still valid, it is just not ready.
   */
  busy?: boolean;
  /** e.g. "Page 3 / 7". Rendered between the arrows; omit to show just the controls. */
  label?: React.ReactNode;
  /** Names the control group for assistive tech, e.g. "Moderation queue pages". */
  'aria-label'?: string;
  className?: string;
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
  busy = false,
  label,
  'aria-label': ariaLabel,
  className,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label={ariaLabel}
      className={cn('flex items-center justify-center gap-3 pt-2', className)}
    >
      <Button
        variant="secondary"
        size="sm"
        disabled={page <= 1 || busy}
        onClick={() => onPageChange(page - 1)}
        // Icon-only, so the name has to be supplied — the arrow glyph is not a label.
        aria-label={ariaLabel ? `${ariaLabel}: previous` : 'Previous page'}
      >
        <ChevronLeft className="size-4" aria-hidden />
      </Button>

      {/* `tabular-nums` so the width does not jitter as the digits change under the cursor. */}
      {label && <span className="text-nx-caption tabular-nums text-nx-text-muted">{label}</span>}

      <Button
        variant="secondary"
        size="sm"
        disabled={page >= totalPages || busy}
        onClick={() => onPageChange(page + 1)}
        aria-label={ariaLabel ? `${ariaLabel}: next` : 'Next page'}
      >
        <ChevronRight className="size-4" aria-hidden />
      </Button>
    </nav>
  );
}
