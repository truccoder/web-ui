import { cn } from '@/shared/lib/cn';

/**
 * The Elite Nexus mark: a terminal-prompt chevron with an amber cursor.
 *
 * HAND-WRITTEN FROM THE RENDERED `guidelines/brand-mark.html` AND ITS TWO SVG ASSETS, which are
 * plain geometry — a rounded square, a three-point polyline, a rounded rect — not component
 * source. CLAUDE.md §1 permits transcribing plain data from the DS provided it is said out loud,
 * so this says it: the path coordinates and the 256-unit viewBox are the DS's, the markup is not.
 *
 * WHAT IT REPLACES, AND WHY THAT MATTERED. Both shells previously drew a `w-8 h-8` box filled with
 * `bg-gradient-to-br from-blue-600 to-indigo-600` and a lucide `Users` (or `ShieldCheck`) glyph —
 * an invented logo, in two raw Tailwind colours that exist in no token and therefore never changed
 * between light and dark. It was the same class of error as the Twilio dock borrowing Facebook's
 * Messenger icon (ds-deviation #22): chrome inventing brand instead of using the one that exists.
 *
 * EVERY COLOUR IS A TOKEN, MEASURED NOT GUESSED. The assets' literals map exactly onto values
 * already in `globals.css`: `#101820` is `--nx-surface-inverse`, `#D18F2E` is `--nx-amber-500`
 * (the same amber `--nx-rep-strong` is built from), `#2C343B` is dark mode's
 * `--nx-border-default`, and `#ECEEEC` is dark mode's `--nx-text-primary`. So the mark introduces
 * no raw colour and follows the theme for free.
 *
 * TWO FORMS, NOT ONE RECOLOURED. The DS ships a filled mark for light surfaces (chevron knocked
 * out of an ink square) and an outlined one for dark (stroked square, light chevron) — that is a
 * design decision about how the mark sits on each background, so both are drawn and the `dark:`
 * variant picks one. Recolouring a single form would produce a mark the DS never shows.
 */

export interface BrandMarkProps {
  /** Rendered size in px (square). @default 32 */
  size?: number;
  className?: string;
}

export function BrandMark({ size = 32, className }: BrandMarkProps) {
  return (
    <svg
      viewBox="0 0 256 256"
      width={size}
      height={size}
      // Decorative: every caller renders the wordmark next to it, so announcing "Elite Nexus"
      // here would say the name twice.
      aria-hidden
      focusable="false"
      className={cn('shrink-0', className)}
    >
      {/* Light: ink square, chevron cut out of it so the page shows through the stroke. */}
      <g className="dark:hidden">
        <defs>
          <mask id="nx-brand-chevron">
            {/* eslint-disable-next-line no-restricted-syntax -- mask channel, not a colour:
                inside a <mask>, white shows and black hides. Tokenising these would break
                the cut-out. */}
            <rect x="8" y="8" width="240" height="240" rx="52" fill="#fff" />
            <path
              d="M83.36 81.64 L129.73 128 L83.36 174.36"
              fill="none"
              // eslint-disable-next-line no-restricted-syntax -- mask channel, see above
              stroke="#000"
              strokeWidth="17"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </mask>
        </defs>
        <rect
          x="8"
          y="8"
          width="240"
          height="240"
          rx="52"
          className="fill-nx-surface-inverse"
          mask="url(#nx-brand-chevron)"
        />
      </g>

      {/* Dark: outlined square, chevron drawn rather than knocked out. */}
      <g className="hidden dark:block">
        <rect
          x="8"
          y="8"
          width="240"
          height="240"
          rx="52"
          fill="none"
          strokeWidth="10"
          className="stroke-nx-border-default"
        />
        <path
          d="M83.36 81.64 L129.73 128 L83.36 174.36"
          fill="none"
          strokeWidth="17"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="stroke-nx-text-primary"
        />
      </g>

      {/* The cursor. Amber in both forms — it is the one element the DS does not vary, so it is
          the raw ramp value `--nx-amber-500` and NOT `--nx-rep-strong`, which resolves to
          amber-600 in light and amber-300 in dark. Written as an arbitrary value because the
          ramp lives outside the `--color-nx-*` namespace and generates no utility of its own. */}
      <rect x="142" y="156" width="44" height="16" rx="8" className="fill-[var(--nx-amber-500)]" />
    </svg>
  );
}
