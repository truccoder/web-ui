/**
 * Compact ink brand tile for the auth screens.
 *
 * APPROXIMATION: the design system ships a `brand-mark` guideline whose exact glyph
 * lives in a `.jsx` this project may not open (Constraint #1). This renders the brand
 * as an ink square with a mono "N" — constitution-safe (ink is structure §1.1, mono is
 * the brand voice §7.1) but not a pixel port of the reference. Swap for the real mark
 * when the app has a shared logo asset.
 */
export function BrandMark() {
  return (
    <span
      aria-hidden
      className="inline-flex size-11 items-center justify-center rounded-nx-md bg-nx-surface-inverse font-mono text-nx-title-sm font-semibold text-nx-text-inverse"
    >
      N
    </span>
  );
}
