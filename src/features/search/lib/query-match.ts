/**
 * Diacritics- and case-insensitive substring matching.
 *
 * The client no longer *filters* results with this — B33 moved projects and roadmaps onto
 * `/search` so every tab reads the one server call. What is left is EXPLAINING a hit: a project
 * matches `java` on a position's skill, not on its title, and the results card says which. The
 * fold has to mirror the server's `f_unaccent(...)` on both sides so "khớp «kiểm thử»" lights up
 * for a query typed `kiem thu` exactly as the backend's own match did.
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

/** The subset of `values` that contain the already-folded `needle` — the reason a row matched. */
export function pickMatching(needleFolded: string, values: Array<string | null | undefined>) {
  if (!needleFolded) return [];
  return values.filter((v): v is string => v != null && foldQuery(v).includes(needleFolded));
}
