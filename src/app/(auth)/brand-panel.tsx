'use client';

import { BrandMark } from '@/shared/components';
import { useT } from '@/core/i18n';

/**
 * The auth screens' brand flank — the half of the sign-in page that is not the form.
 *
 * WHY THERE IS ANYTHING HERE AT ALL. The auth screens were one card centred on an empty ground:
 * at 1440 that is a 448-wide card with roughly 500 of bare gray on either side, and nothing on
 * the screen said what the product was. Sign-in is the only surface a stranger sees before they
 * have an account, so it is the one place the brand has to introduce itself rather than assume.
 *
 * WHY NOT A PHOTOGRAPH OR AN ILLUSTRATION, which is the usual answer to this problem and was
 * considered first. Three reasons, in the order they decided it:
 *
 *  1. There is no brand imagery to use. `public/` holds Next's own starter SVGs and the PWA
 *     icons, nothing else — so an image means inventing one, and `BrandMark`'s own header records
 *     what that costs: the shells previously drew an invented gradient logo, and the note there
 *     names it as the same class of error as the chat dock borrowing Messenger's icon.
 *  2. A raster is the one element on the screen that cannot follow the theme. Every colour in
 *     this app resolves through a token and flips at `[data-theme='dark']`; a photograph would
 *     need two files and a `<picture>`, and would still be the only thing that is approximately
 *     right in one of the two.
 *  3. Constitution §1.5 already forbids decorative gradients — the auth layout's own comment
 *     records removing a blue/indigo one. A stock photo of people at laptops is the same
 *     argument, one step further out: decoration carrying no information.
 *
 * WHAT IS DRAWN INSTEAD IS THE BRAND'S OWN METAPHOR. The mark is a terminal prompt — a chevron
 * with an amber cursor — so the panel is a terminal. That costs no asset, is built entirely from
 * tokens, and is theme-correct for free. It is also the only illustration available that is
 * *about* this product rather than about software in general.
 *
 * THE THREE LINES ARE TRUE, and that is a constraint rather than a flourish. A login panel is the
 * easiest place in an app to promise something the product does not do, and a fabricated
 * transcript — a name, an Elite Score, a streak — would read as somebody's real record. So the
 * terminal prints capabilities that exist and are reachable from the rail the moment you are in:
 * verified reputation (`/profile`), the skill roadmap (`/roadmap`), the community library
 * (`/library`). No numbers, no person, nothing that could be mistaken for data.
 *
 * IT IS HIDDEN BELOW `lg`, so the phone keeps exactly the screen it has today: one card, centred.
 * A brand panel stacked above a sign-in form on a 390-wide screen is two scrolls before the email
 * field, which is worse than no panel at all.
 */

/** One printed line of the transcript. `tone` picks which of the two ink text values it takes. */
function Line({
  children,
  tone = 'muted',
}: {
  children: React.ReactNode;
  tone?: 'muted' | 'text';
}) {
  return (
    <div
      className={
        tone === 'text'
          ? 'text-nx-brand-ink-text'
          : // The check marks and their labels are quieter than the command that produced them —
            // output is subordinate to the prompt, which is how a terminal actually reads.
            'text-nx-brand-ink-muted'
      }
    >
      {children}
    </div>
  );
}

export function BrandPanel() {
  const t = useT();

  /**
   * FIVE LINES, NOT THREE, AND THE TWO NEW ONES ARE HERE FOR THE RHYTHM AS MUCH AS THE CONTENT.
   *
   * Measured on the finished panel at 1440: the middle block was 283 tall inside a 900 panel,
   * leaving 243 of nothing above it and 243 below. Symmetric, so not broken — but a third of the
   * panel's height carrying nothing, with one small island floating in it. Two more printed lines
   * and the supporting sentence take the block past 400 and the voids under 190.
   *
   * They are held to the same rule as the first three: every line names a surface that exists and
   * is one click from the rail. `/projects` is the team-finding board, `/chats` is the messaging
   * surface. Nothing here is a promise the product does not already keep.
   */
  const points = [
    t('auth.brand.pointProfile'),
    t('auth.brand.pointRoadmap'),
    t('auth.brand.pointLibrary'),
    t('auth.brand.pointProjects'),
    t('auth.brand.pointChat'),
  ];

  return (
    <aside
      // `hidden lg:flex` PAIRS WITH THE LAYOUT'S `lg:grid-cols-2` and the two must switch on the
      // same breakpoint, or there is a band where the grid has reserved a column for a panel that
      // is not rendering into it.
      //
      // `sticky top-0 h-screen` because the register form is taller than the viewport: without it
      // the panel's content would be stretched down the page by the grid row and its wordmark
      // would scroll away above the fold.
      className="sticky top-0 hidden h-screen flex-col justify-between bg-nx-brand-ink p-10 lg:flex"
    >
      <div className="flex items-center gap-2.5">
        {/* `on="dark"` IS LOAD-BEARING — see the prop's own note. Left on `auto` the mark draws
            its ink square on an ink panel in light mode and disappears. */}
        <BrandMark size={32} on="dark" />
        <span className="text-nx-heading font-semibold tracking-tight text-nx-brand-ink-text">
          {t('app.name')}
        </span>
      </div>

      {/* `gap-5` is the BLOCK rung (20). The tagline and the terminal are two blocks of one
          statement, not two regions — the panel's own 40 of padding is what separates regions
          here, and repeating it inside would leave the pair reading as unrelated. */}
      <div className="flex flex-col gap-5">
        {/* The measure is capped rather than left to the column: a 32px line running the full
            width of a 720-wide panel is too long to read comfortably. */}
        <div className="flex flex-col gap-4">
          <p className="max-w-[20ch] text-nx-display text-nx-brand-ink-text">
            {t('auth.brand.tagline')}
          </p>
          {/* The supporting line the tagline needed. A 32px claim on its own is a slogan; one
              sentence under it is the difference between a poster and an introduction. Held to
              `36ch` so it breaks to two lines under the headline rather than running past it. */}
          <p className="max-w-[36ch] text-nx-body text-nx-brand-ink-muted">
            {t('auth.brand.subtagline')}
          </p>
        </div>

        {/* THE TERMINAL. A block one step off the panel, hairlined, mono — the three things that
            make a reader parse a rectangle as a console rather than as a quote.

            `54ch` OF 13px MONO IS ~420px, which is where the tagline's own `20ch` of 32px display
            lands. The two caps are written in different units because they are measuring different
            type, but they are chosen to agree: a console visibly narrower than the sentence above
            it reads as an inset quote instead of as the panel's second block. */}
        <div className="max-w-[54ch] rounded-nx-md border border-nx-brand-ink-line bg-nx-brand-ink-block p-5 font-mono text-nx-code">
          <Line tone="text">
            {/* The prompt glyph is faint so the command reads as the content of the line rather
                than competing with it. */}
            <span className="text-nx-brand-ink-muted">$ </span>
            {t('auth.brand.command')}
          </Line>

          <div className="mt-3 flex flex-col gap-2">
            {points.map((point) => (
              <Line key={point}>
                {/* Amber, the one accent the mark itself uses, and the only sanctioned amber
                    outside reputation is the mark — so it appears here as the mark's cursor does,
                    not as a status colour. */}
                <span className="text-[var(--nx-amber-500)]">✓ </span>
                {point}
              </Line>
            ))}
          </div>

          {/* The cursor, resting on an empty prompt: the transcript has finished and the console
              is waiting, which is the same thing the form beside it is doing.

              `animate-pulse` rather than a step blink, and `motion-reduce:animate-none` because a
              perpetual animation is exactly what that preference exists to switch off. */}
          <div className="mt-3 flex items-center gap-2">
            <span className="text-nx-brand-ink-muted">$</span>
            <span
              aria-hidden
              className="inline-block h-4 w-2 animate-pulse bg-[var(--nx-amber-500)] motion-reduce:animate-none"
            />
          </div>
        </div>
      </div>

      <p className="text-nx-body-sm text-nx-brand-ink-muted">{t('auth.brand.footer')}</p>
    </aside>
  );
}
