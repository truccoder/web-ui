'use client';

import { useState } from 'react';
import { cn } from '@/shared/lib/cn';

/**
 * The pictures attached to a post.
 *
 * `FeedPostDataDto.images` HAS BEEN ON THE WIRE THE WHOLE TIME AND WAS RENDERED NOWHERE. The feed
 * DTO and the update DTO both carry `images?: string[]`, `feed-post.tsx` has always mapped it
 * through the editor so that saving an edit does not destroy the pictures — and `PostCard`
 * received it and dropped it. A post could hold images that no screen in the product would show.
 *
 * THE REASON IT STAYED UNBUILT WAS THAT NOTHING COULD PRODUCE ONE. There was no upload endpoint
 * (B16) and no seeded post carrying a URL (S10, measured 24/08: 80 posts, zero images), so the
 * grid would have been code with no way to see it run. Both are paid — `POST /v1/api/media` takes
 * files, and `V69` seeds the 1 / 2 / 5-image cases deliberately — so this is now a view of real
 * data rather than a guess about future data.
 *
 * URLS FROM AN ARBITRARY HOST, WHICH IS WHY `next/image` IS NOT USED. `images` is a list of URLs,
 * not object keys: they can point at MinIO, or at anywhere a person pasted from. `next/image`
 * would need every one of those hosts declared in `next.config.ts` and would 500 on the first one
 * that is not — a broken post takes the page with it. Plain `<img>` degrades to a missing picture,
 * which is what `link-body.tsx` and the article cover already do for the same reason.
 */
export interface PostImagesProps {
  /** `FeedPostDataDto.images`. Null, undefined and empty all render nothing. */
  images?: string[] | null;
  className?: string;
}

/**
 * Above this, the extra pictures become a `+N` badge on the last tile.
 *
 * FOUR, BECAUSE THE GRID IS TWO COLUMNS. Five images would leave one tile alone on a third row,
 * which reads as a layout accident rather than as a set. Seed carries a five-image post
 * specifically to exercise this branch, so it is not a hypothetical.
 */
const MAX_TILES = 4;

export function PostImages({ images, className }: PostImagesProps) {
  /**
   * FAILURES ARE TRACKED PER URL, NOT AS ONE FLAG. `link-body.tsx` can afford a single boolean
   * because it has one thumbnail; here a single flag would let one dead URL blank out three good
   * pictures beside it. Seed carries a deliberately broken URL for exactly this branch.
   *
   * A `Set` in state rather than a ref: a failed load has to re-render to drop the tile.
   */
  const [failed, setFailed] = useState<ReadonlySet<string>>(() => new Set());

  const usable = (images ?? []).filter((url) => url?.trim() && !failed.has(url));
  if (usable.length === 0) return null;

  const tiles = usable.slice(0, MAX_TILES);
  const overflow = usable.length - tiles.length;

  return (
    <div
      className={cn(
        // ONE COLUMN AT ONE PICTURE. A lone image in a two-column grid would be half a card wide
        // with a hole beside it; at one column it gets the measure the prose above it has.
        'grid gap-1 overflow-hidden rounded-nx-sm',
        tiles.length === 1 ? 'grid-cols-1' : 'grid-cols-2',
        className
      )}
    >
      {tiles.map((url, index) => {
        const isLast = index === tiles.length - 1;
        return (
          <div
            key={url}
            className={cn(
              'relative bg-nx-surface-sunken',
              // A single picture keeps its own proportions up to a ceiling — cropping the only
              // image on a post to a square is destroying the thing the author posted. In a grid
              // the tiles have to agree, so there the aspect is fixed and the crop is the price.
              tiles.length === 1 ? 'max-h-[28rem]' : 'aspect-[4/3]',
              // Three pictures: the first spans both columns, so the row of two below it reads as
              // the remainder rather than as a broken pair.
              tiles.length === 3 && index === 0 && 'col-span-2'
            )}
          >
            {/* Author-supplied URL from an arbitrary host — see the module note. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt=""
              loading="lazy"
              onError={() => setFailed((prev) => new Set(prev).add(url))}
              className={cn(
                'w-full',
                tiles.length === 1 ? 'max-h-[28rem] object-contain' : 'h-full object-cover'
              )}
            />

            {isLast && overflow > 0 && (
              // `+N` rather than a count of the whole set: the reader can see the four in front
              // of them, and the number that matters is how many they are not seeing.
              <span
                className={cn(
                  'absolute inset-0 grid place-items-center',
                  'bg-nx-surface-overlay/70 font-mono text-nx-heading text-nx-text-primary'
                )}
              >
                +{overflow}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
