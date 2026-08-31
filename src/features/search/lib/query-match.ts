/**
 * Diacritics- and case-insensitive substring matching, for the two result tabs the backend
 * cannot search for us.
 *
 * `/v1/api/search` covers people, posts and books only (`docs/backend-plan.md` B33). The Projects
 * and Roadmaps tabs therefore filter their list endpoints on this side, and they have to fold
 * accents the same way the server's `unaccent(...)` does for everything else — a page that found
 * `Lộ trình` for `lo trinh` in one tab and not the next would be the app disagreeing with itself.
 *
 * The transform is the same one `shared/components/command-palette.tsx` runs for the same reason;
 * a shared extraction is a bigger change than this warrants, so the two are kept in step by hand.
 */

/** `NFD` + strip combining marks + lowercase. Call once on the query, reuse across rows. */
export function foldQuery(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

/**
 * Whether any of `fields` contains the already-folded `needle`. A blank needle matches
 * everything, so a caller can pass the raw query through without a length guard.
 */
export function matchesQuery(
  needleFolded: string,
  ...fields: Array<string | null | undefined>
): boolean {
  if (!needleFolded) return true;
  return fields.some((field) => field != null && foldQuery(field).includes(needleFolded));
}
