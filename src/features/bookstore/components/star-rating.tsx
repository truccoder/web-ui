import * as React from 'react';
import { Star } from 'lucide-react';

/**
 * Read-only star display, with fractional fill.
 *
 * NO DESIGN-SYSTEM SPECIMEN EXISTS FOR THIS. `components/` in the DS has actions, display, forms,
 * navigation and overlays — there is no `Rating`, no `Stars`, nothing to compare against. Same gap
 * already recorded for the chat surfaces (ds-deviations #21/#22), so this is built from tokens and
 * logged as an invention rather than a match. Recorded as #24.
 *
 * STARS ARE INK, NOT AMBER — a deliberate reading of the constitution rather than an oversight.
 * Law 01 is "ink is structure, blue is action, amber is evidence", and it justifies itself with
 * "amber's scarcity is what makes reputation legible". A five-star widget repeated on every book
 * row is exactly the volume that would spend that scarcity, and a book's average rating is
 * aggregate opinion — not the earned, traceable evidence Law 02 means by reputation. The legacy
 * bridge used `text-amber-500` here; that is the thing being corrected, not preserved.
 *
 * Filled-vs-outline carries the signal, so nothing is lost by dropping the colour.
 */
export interface StarRatingProps {
  /** 0–5, fractional allowed. */
  rating: number;
  /** Star edge length in px. @default 13 */
  size?: number;
}

export function StarRating({ rating, size = 13 }: StarRatingProps) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating.toFixed(1)} / 5`} role="img">
      {[0, 1, 2, 3, 4].map((i) => {
        // Clip the filled star to the fraction it earns, so 3.5 renders as three full stars, one
        // half-filled and one empty — rather than rounding the half away.
        const fillPercent = Math.round(Math.max(0, Math.min(1, rating - i)) * 100);
        return (
          <span
            key={i}
            className="relative inline-block"
            style={{ width: size, height: size }}
            aria-hidden
          >
            <Star
              className="absolute inset-0 text-nx-text-faint"
              style={{ width: size, height: size }}
            />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fillPercent}%` }}>
              <Star
                className="fill-current text-nx-text-primary"
                style={{ width: size, height: size }}
              />
            </span>
          </span>
        );
      })}
    </div>
  );
}
