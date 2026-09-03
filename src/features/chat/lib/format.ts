/**
 * Byte count → a short human label (`"240 KB"`, `"1.4 MB"`).
 *
 * LOCAL TO CHAT because it is the only place in the app that shows a file size — the shared
 * `format.ts` is dates and currency, and a formatter with one caller does not earn a spot in
 * `shared/` (CLAUDE.md §4, same rule that kept the date helper local until a second domain needed
 * it). Promote it the day something else does.
 *
 * BASE 1000, NOT 1024. This labels a file a person just picked from their OS, and every desktop
 * file manager they might have checked it in reports base-1000 KB/MB — matching that is less
 * surprising than being "correct" about KiB.
 */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '';
  if (bytes < 1000) return `${bytes} B`;

  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1000;
  let unitIndex = 0;
  while (value >= 1000 && unitIndex < units.length - 1) {
    value /= 1000;
    unitIndex += 1;
  }

  // One decimal below 10 (1.4 MB), none above (240 KB) — the extra digit is only information when
  // the integer part is small.
  const rounded = value >= 10 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded} ${units[unitIndex]}`;
}
