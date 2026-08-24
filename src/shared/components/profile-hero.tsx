import * as React from 'react';
import { Avatar } from './avatar';
import { Card } from './card';

/**
 * The block a profile page opens with: picture, name as the page's `<h1>`, handle, and whatever
 * the route hangs off either side of them.
 *
 * ── ONE HERO, BECAUSE THERE WAS NEVER MORE THAN ONE. ──────────────────────────────────────────
 * `/profile` and `/u/[username]` are the same object seen from two angles — your own account and
 * somebody's public record — and both opened with a card holding an avatar, an `<h1>`, a
 * `@handle` and a `RepScore` chip beside the name. They were two independent pieces of markup
 * that had drifted the way two copies always do:
 *
 *  - THE AVATAR WAS 96 ON ONE AND 64 ON THE OTHER, which no argument in either file defends. Both
 *    are the hero of a page about one person, so both are 96 now.
 *  - THE ALIGNMENT DISAGREED, and each side had written down a reason. `/profile` argued for
 *    `items-center`: "against two lines that are shorter than the 96 avatar, top alignment hangs a
 *    short stack off the top of a tall circle with all the slack pooled underneath". `/u` argued
 *    for `items-start`: "a wrapped Vietnamese name grows downward instead of dragging the avatar
 *    off centre". Both were right about their own hero — the second was written when its avatar
 *    was 64, i.e. shorter than a wrapped two-line stack, where centring really does pull the
 *    picture down. At 96 the stack is the shorter of the two in every case that is not a name
 *    wrapping to three lines, so `items-center` wins and the disagreement was really about size.
 *  - ONLY ONE OF THEM STACKED ON A PHONE. `/profile` went to a centred column below `sm`; `/u`
 *    kept avatar, name and two buttons on one row at every width.
 *  - THE `<h1>` TRUNCATED ON ONE AND WRAPPED ON THE OTHER. It wraps now: a hero exists to say
 *    whose page this is, and `Nguyễn Thị Thanh Ngu…` fails at the one job.
 *
 * WHAT IS *NOT* SHARED IS PASSED IN, and the two routes differ in exactly three places — the
 * picture is uploadable on your own page (`avatarOverlay`), somebody else's page carries the
 * message/block pair (`actions`), and only the uploader has anything to report (`footer`). Every
 * one of those is a slot rather than a flag, so this component knows nothing about uploads,
 * blocking or reputation.
 *
 * IT IS IN `shared` RATHER THAN IN `security`, and that is what the slots buy: it holds no query
 * and no domain type, so the route that renders somebody else's profile does not have to import
 * the feature that owns *your* account to draw a header.
 */
export interface ProfileHeroProps {
  /**
   * The `<h1>`. Callers pass their own fallback — `/profile` shows an em dash while the query is
   * in flight, `/u/[username]` shows the handle from the URL, and those are different answers to
   * "we do not have a name yet" rather than one default this component could pick.
   */
  name?: string | null;
  /** Printed as `@handle` under the name. Omitted entirely when absent. */
  username?: string | null;
  avatarUrl?: string | null;
  /**
   * On the name line, after the name. Intended for the Elite Score chip, and deliberately typed as
   * a node: reputation is a feature this component must not know about, and both routes already
   * have the score in hand by the time they render a hero.
   */
  badge?: React.ReactNode;
  /**
   * Drawn over the picture, inside the circle. For `/profile`'s upload button, which needs
   * `absolute inset-0` against the wrapper below.
   */
  avatarOverlay?: React.ReactNode;
  /** Hung off the right edge — the message/block pair, or a guest's sign-up prompt. */
  actions?: React.ReactNode;
  /** Under the handle. Currently one thing: the upload's error line. */
  footer?: React.ReactNode;
}

export function ProfileHero({
  name,
  username,
  avatarUrl,
  badge,
  avatarOverlay,
  actions,
  footer,
}: ProfileHeroProps) {
  return (
    <Card className="w-full">
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
        {/* `flex`, AND IT IS LOAD-BEARING RATHER THAN TIDINESS. `Avatar` renders an `inline-flex`
            span, so inside a plain block this div sits on a text baseline and the line box adds the
            descender gap under it: the wrapper measured 96 × 103 around a 96 × 96 picture. That is
            not only a stray 7px of layout — this div is what `avatarOverlay` anchors to with
            `absolute inset-0`, so the round overlay was drawn as a 96 × 103 ellipse bleeding below
            the circle it is supposed to cover. Making the wrapper a flex container turns the avatar
            into a flex item, which has no baseline to hang from.

            `group` is here for the overlay's `group-hover:` — the uploader's reveal is its own
            business, but the element it reveals against is this one. */}
        <div className="group relative flex shrink-0">
          {/* `inset`: the seeded pictures are circles drawn to the edge of a square file, and a
              circular mask over one of those shaves its outline flat at four points. See the
              prop's note on `Avatar`. */}
          <Avatar src={avatarUrl ?? undefined} name={name ?? undefined} size="2xl" inset />
          {avatarOverlay}
        </div>

        <div className="min-w-0 flex-1 text-center sm:text-left">
          {/* The score sits BESIDE THE NAME, as the kit's profile hero does — reputation is the
              product's central claim, so it is part of the identity line rather than a fact you
              scroll to. The reputation card in the first tab still owns the progress to the next
              level; this is the readout, that is the apparatus. */}
          <div className="flex flex-wrap items-center justify-center gap-[var(--nx-space-tight)] sm:justify-start">
            <h1 className="text-nx-title font-semibold tracking-tight text-nx-text-primary">
              {name}
            </h1>
            {badge}
          </div>
          {username && (
            <p className="truncate font-mono text-nx-body-sm text-nx-text-muted">@{username}</p>
          )}
          {footer}
        </div>

        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </Card>
  );
}
