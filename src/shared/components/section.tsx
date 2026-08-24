import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/shared/lib/cn';

/**
 * A titled region of a page: an `<h2>`, an optional sentence under it, an optional link hung off
 * its right edge, and whatever fills it.
 *
 * ── IT EXISTS TO SETTLE WHO NAMES A SECTION, WHICH THE APP ANSWERED TWO WAYS. ─────────────────
 * Both profile routes had grown two idioms side by side:
 *
 *  1. THE PAGE NAMES IT — `<section><h2 class="title-sm">…</h2><Card>…</Card></section>`. Used by
 *     the skills card, the GitHub card, the violations panel, the block list, the professional
 *     form, the network tiles: ten copies of the same six lines across two files.
 *  2. THE COMPONENT NAMES ITSELF — a `Card` opening with its own `<h3 class="heading">` and a
 *     subtitle. Used by `ReputationCard`, `ProfileInfoForm`, `ChangePasswordForm`.
 *
 * Two idioms on one page is not a style quibble; both routes carry a scar from it:
 *
 *  - `/profile`'s `Tài khoản` tab ran `<h1>` → `<h3>` → `<h3>` → `<h2>` → `<h2>`. The two forms
 *    that LEAD the tab ranked BELOW the two panels under them, and a screen reader listing the
 *    page's headings got that order. Skipping from `<h1>` to `<h3>` is the `heading-order` rule;
 *    the `<h2>`s arriving afterwards is the part no linter would even have a name for.
 *  - `/u/[username]` had to write "NO `<h2>` OVER THE REPUTATION CARD" in a comment, because
 *    adding the heading its four neighbours have printed `Elite Score` twice, twenty pixels apart.
 *    A section that cannot be labelled like its siblings is the component naming itself.
 *  - The same rank of title rendered at 20px on the page ground or 18px inset in a card depending
 *    on which of the two idioms the component behind it happened to use.
 *
 * SO: THE PAGE NAMES THE SECTION, THE COMPONENT FILLS IT. A component that renders into one of
 * these is headless — it draws its own `Card` and its own content and no title. That is the rule,
 * and it is enforceable by reading a file rather than by remembering a convention: if a component
 * opens with an `<h3>` and a subtitle, it predates this and should be converted.
 *
 * `<h3>` IS STILL RIGHT INSIDE THE FILL — `ProfessionalProfileForm` groups its fields under two
 * of them. The rule is about who owns the SECTION's name, not about banning deeper headings.
 */
export interface SectionProps {
  /** The `<h2>`. */
  title: string;
  /**
   * One sentence under the title, for a section whose purpose is not obvious from its name.
   *
   * A `ReactNode` rather than a string because two of these carry a link mid-sentence, and the
   * alternative — a `linkHref`/`linkLabel` pair — is a worse API for one caller.
   */
  description?: React.ReactNode;
  /**
   * Hung off the right edge, baseline-aligned with the `<h2>`. Usually a `SectionLink`.
   *
   * It aligns with the TITLE, not with the description, so a section with a sentence and one
   * without hang their link at the same height down a column.
   */
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function Section({ title, description, action, children, className }: SectionProps) {
  return (
    <section className={cn('flex flex-col gap-[var(--nx-space-element)]', className)}>
      <div className="flex items-baseline justify-between gap-[var(--nx-space-element)]">
        <div className="flex min-w-0 flex-col gap-[var(--nx-space-pair)]">
          <h2 className="text-nx-title-sm text-nx-text-primary">{title}</h2>
          {description && <p className="text-nx-body-sm text-nx-text-muted">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/**
 * The accent link a section hangs off its heading — `Tất cả bạn bè`, `Xem lộ trình`.
 *
 * A component rather than an exported class string because the string was being copied WITH its
 * focus ring, and the two copies that dropped `shrink-0` were the ones that wrapped their label
 * onto two lines next to a long title.
 */
export function SectionLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'shrink-0 text-nx-body-sm text-nx-text-accent hover:underline',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring',
        className
      )}
    >
      {children}
    </Link>
  );
}
