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

/**
 * The design-system radius scale (`--radius-nx-*` in the `@theme` block).
 *
 * SAME CLASS OF PROBLEM AS THE FONT SIZES, found the same way — by measuring. tailwind-merge
 * recognises `rounded-*` only for values it knows, and `nx-sm` / `nx-full` are not on its scale,
 * so it treats them as unrelated classes and keeps BOTH. Two `border-radius` declarations then
 * reach the element and the stylesheet's order decides, not the caller's: trending's filter
 * button asked for `rounded-nx-full` inside a pill-shaped bar and rendered at `Button`'s own
 * `rounded-nx-sm` — a near-square corner four pixels inside the bar's radius.
 *
 * Declaring the scale is what makes a caller's radius beat a component's default, which is the
 * whole contract `cn` is supposed to provide.
 */
const NX_RADII = ['nx-xs', 'nx-sm', 'nx-md', 'nx-lg', 'nx-xl', 'nx-full'];

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: NX_FONT_SIZES }],
      rounded: [{ rounded: NX_RADII }],
    },
  },
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
