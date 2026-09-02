/**
 * The frontend copy of the backend's `HashtagNormalizer.normalize` — B31.
 *
 * Every read path that takes a hashtag from user input (this feature's search box) or from a
 * rendered badge (`post-card.tsx` passing a tag back into `?hashtag=`) has to fold the string the
 * same way the backend stored it, or the lookup silently matches nothing. The backend stores a tag
 * as the lower-cased body of the `#(\w+)` match: no `#`, no case, no surrounding space.
 *
 * DELIBERATELY DOES NOT STRIP CHARACTERS OUTSIDE `[a-z0-9_]`, matching the backend to the letter: a
 * query of `c++` folds to `c++`, matches no row and returns nothing — which is the correct answer,
 * not an error. Stripping would turn it into `c`, a different, populated tag nobody asked for.
 *
 * @returns the folded name, or `null` when nothing is left after folding — which callers read as
 *   "no hashtag", never as "the empty hashtag" (do not call the endpoint with it).
 */
export function normalizeHashtag(raw: string | null | undefined): string | null {
  if (raw == null) return null;

  let folded = raw.trim();

  // Strip every leading '#' and space, not just one: a paste of "##java" or "# java" from a
  // rendered badge should still resolve to the stored name. Mirrors the backend's char loop.
  let start = 0;
  while (start < folded.length && (folded[start] === '#' || folded[start] === ' ')) {
    start += 1;
  }

  folded = folded.slice(start).trim().toLowerCase();
  return folded.length === 0 ? null : folded;
}
