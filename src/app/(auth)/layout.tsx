import { BrandPanel } from './brand-panel';
import { LocaleToggle } from './locale-toggle';

/**
 * The auth shell — form on the left, brand on the right, one column below `lg`.
 *
 * IT WAS A SINGLE CENTRED CARD until the split arrived. The reason for changing it is in
 * `BrandPanel`'s header; what belongs here is the geometry.
 *
 * THE PANEL IS 520 WIDE, NOT HALF THE VIEWPORT, and the number comes from what is inside it
 * rather than from the screen. Its widest element is the terminal at `54ch` of 13px mono — about
 * 421 — and the panel's own `p-10` adds 40 a side, so 501 is the content's true footprint and 520
 * leaves it a little air. At an even split the panel was 713 at 1440: nearly 200px of ink that no
 * line ever reached, which read as a band rather than as a column with something in it.
 *
 * A GRID, NOT A FLEX ROW WITH TWO `w-1/2`s. The register form runs past the fold, and a grid row
 * gives both cells the same height automatically — so the panel's cell is as tall as the form's
 * however long the form gets, and the panel can `sticky` inside it. Two flex halves would need
 * that height plumbed by hand.
 *
 * THE FORM COLUMN KEEPS ITS OLD MEASURE EXACTLY: `max-w-md`, centred, `p-4`. The split moved the
 * card off the middle of the viewport, and nothing else about it changed — every auth route under
 * this layout renders the same card at the same width it did before.
 *
 * BELOW `lg` THE PANEL IS NOT RENDERED and the grid collapses to its single implicit column, which
 * reproduces the previous screen exactly rather than approximately.
 *
 * The flat `surface-page` ground stays — constitution §1.5 forbids decorative gradients, and the
 * blue/indigo one this file used to carry was removed at P0.5 for that reason. The panel is not a
 * reintroduction of it: it is a flat fill carrying content, not a gradient carrying nothing.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen bg-nx-surface-page lg:grid-cols-[1fr_520px]">
      {/* `lg:bg-nx-surface-card` — THE COLUMN IS THE CARD NOW.
          `AuthCard` dissolves its own fill above `lg`, and something has to hold the form or it
          would be loose text on the grey ground. Painting the COLUMN instead of the card gives
          the split its shape: a white half against the panel's ink, edge to edge, with no nested
          rectangle in the middle of it. Below `lg` this stays `surface-page` and the card comes
          back — see `AuthCard`. */}
      <div className="relative flex items-center justify-center p-4 lg:bg-nx-surface-card">
        {/* OUT OF THE FORM'S FLOW ON PURPOSE. The card is centred on the column, and anything
            added above it in normal flow pushes that centre off. Absolute keeps the form where it
            is and puts the toggle in the corner the eye already checks for one.

            It is pinned to THIS COLUMN rather than to the page, so above `lg` it lands on the
            white half and never crosses onto the panel; below `lg` the column is the page and it
            sits in the viewport's own corner. */}
        <LocaleToggle className="absolute top-4 right-4 lg:top-5 lg:right-5" />

        <div className="w-full max-w-md">{children}</div>
      </div>

      <BrandPanel />
    </div>
  );
}
