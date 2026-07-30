import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * The design-system type scale (`--text-nx-*` in the `@theme` block). tailwind-merge has
 * no way to know that `text-nx-ui` is a font size while `text-nx-text-primary` is a
 * colour — it classifies both as `text-color` and drops the earlier one. Declaring the
 * scale here is what keeps a size and a colour from cancelling each other out.
 */
const NX_FONT_SIZES = [
  'nx-display',
  'nx-title',
  'nx-title-sm',
  'nx-heading',
  'nx-subhead',
  'nx-body',
  'nx-ui',
  'nx-body-sm',
  'nx-code',
  'nx-caption',
  'nx-micro',
  'nx-overline',
];

const twMerge = extendTailwindMerge({
  extend: { classGroups: { 'font-size': [{ text: NX_FONT_SIZES }] } },
});

/**
 * Merge Tailwind classes, letting later ones win over earlier conflicts.
 *
 * Duplicated from the legacy `src/lib/utils.ts` rather than imported from it: nothing
 * under `shared/` may depend on `lib/`, which is being dismantled. The legacy copy dies
 * with `src/lib/`.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
