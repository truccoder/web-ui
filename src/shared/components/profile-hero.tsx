import * as React from 'react';
import { Avatar } from './avatar';
import { Card } from './card';

/**
 * The block a profile page opens with: a cover strip, then picture, name as the page's `<h1>`,
 * handle, and whatever the route hangs off either side of them.
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
 *
 * ── THE COVER STRIP, AND THE THREE THINGS IT IS NOT ───────────────────────────────────────────
 * The card opens with a full-bleed band, which is why it is `padding={0}` with the padding moved
 * onto the identity row, and why `overflow-hidden` is new — a band inside a `rounded-nx-md` box
 * squares off the card's own top corners otherwise.
 *
 * IT IS NOT A GRADIENT, AND THAT WAS THE FIRST PLAN. `docs/backend-plan.md` B18 originally
 * promised a band keyed to the username by hue for the wait, which is the ordinary way to give
 * every profile its own colour before covers exist. The system forbids it twice over: "**No
 * gradients anywhere**", and under Imagery, "no patterns, no textures and no decorative
 * gradients … when a visual is needed … it is a token-coloured placeholder block". `Avatar` had
 * already lost the same argument for the same reason — see its note on why initials fall back to
 * one neutral surface rather than a name-stable colour. A per-user hue here would have re-opened,
 * 96px lower down the same card, a question that component settled.
 *
 * SO THE EMPTY STATE *IS* THE PLACEHOLDER BLOCK: `surface-sunken`, the same well the kit gives a
 * book with no artwork. Every profile without a cover looks identical, which is honest — they are
 * identical in this respect, and what distinguishes this page is the picture and the name a few
 * pixels below it.
 *
 * THE AVATAR OVERLAPS IT, at the owner's call, and the name sits on the circle's foot line. That
 * is the shape people expect from a cover, and it is what makes the band read as this person's
 * masthead rather than a grey strip the card happens to start with.
 *
 * ── WHY THE ROW IS `sm:items-start` AND THE AVATAR IS `-mt-16` ────────────────────────────────
 * The first version of the overlap was `items-end` with `-mt-12`, and it had a fault this file
 * wrote down at the time: `items-end` aligns bottoms, so the ROW'S HEIGHT — which is the text's
 * height — decided how far the circle rose out of it. Two lines of name and handle left about
 * 28px of overlap; a third line took it to nothing. That was tolerable while the text block was
 * exactly two lines, and it stopped being tolerable the moment `subtitle` and `meta` were added
 * below, which is what they are for.
 *
 * `items-start` breaks the coupling: the circle hangs off the TOP of the row, which does not
 * move, so every line added below flows downward and the overlap is a constant.
 *
 *   row top       = band bottom + var(--nx-space-pad-y)  = band bottom + 16
 *   avatar top    = row top − 64                          → 48px of band, ALWAYS
 *   avatar bottom = row top + 32
 *   name line     = --text-nx-title 24px × 1.25           = 30px → bottom at row top + 30
 *
 * SO `-mt-16` IS NOT AN ARBITRARY 64. It is chosen so that what remains of the avatar below the
 * row's top (96 − 64 = 32) matches the title's line box (30), which is what puts the name on the
 * circle's foot without a hand-tuned padding on the text column. Change the title's size or its
 * line-height and this number owes a recount. The 2px it is out by is under one line's leading and
 * does not survive a screenshot.
 *
 * The phone keeps `items-center`, which below `sm` is horizontal centring of a column — the avatar
 * is above the text there, so the overlap was never coupled to anything in the first place.
 *
 * THE RING IS `surface-card`, NOT A BORDER. The circle has to separate from whatever photograph
 * is behind it, and the thing it should look cut out of is the card it sits on — so the ring is
 * the card's own fill, which means it disappears against the lower half and does the work only
 * where the avatar crosses the band.
 *
 * IT DOES NOT VANISH ON A PHONE, but it does come down to 96 from 128. It is a masthead, not a
 * billboard, and the canvas it sits in is 672px at its widest.
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
   * The cover strip's image.
   *
   * NOTHING PASSES THIS TODAY, AND THAT IS DELIBERATE RATHER THAN AN OVERSIGHT. The backend has
   * no cover to pass: `t_users` has no column, `UserResponse` and `PublicProfileResponse` have no
   * field, and `UpdateProfileRequest` edits `fullName` and nothing else. `docs/backend-plan.md`
   * B18 is the request. The prop exists so that the band has a real image branch to switch into
   * on the day that lands, instead of the two routes each growing one — B18's claim that only the
   * source will change is true only if the branch is already here to be changed.
   *
   * A DEAD URL FALLS BACK BY DOING NOTHING, which is why there is no `onError` state here.
   * `book-body` and `link-body` both keep one because they have somewhere to switch TO — a
   * title's first letter, a stripped layout. This band's fallback is the surface already painted
   * underneath it, and `alt=""` is the form that draws no broken-image glyph over that surface.
   */
  coverUrl?: string | null;
  /**
   * On the name line, after the name. Intended for the Elite Score chip, and deliberately typed as
   * a node: reputation is a feature this component must not know about, and both routes already
   * have the score in hand by the time they render a hero.
   */
  badge?: React.ReactNode;
  /**
   * The role line — "Backend Engineer · Fintech" — between the name and the handle.
   *
   * THE KIT ASKED FOR THIS LINE AND THE HERO HAD NEVER HAD IT. `NX_USER` carries `role` beside
   * name and handle, `DeveloperIdentity.d.ts` types it, and the kit's own profile screen prints
   * it under the name. It is the one line of that hero this component was missing.
   *
   * ABOVE THE HANDLE, WHICH IS WHERE THE TWO KIT DOCUMENTS DISAGREE. `DeveloperIdentity.prompt.md`
   * calls its order doctrine — "avatar → name → reputation → time / role → handle", and names the
   * profile hero as one of the surfaces it governs — while `ScreenProfile` hand-rolls a hero that
   * puts the handle first. The `.prompt.md` wins here because it is the component's contract and
   * the screen is one rendering of it; it also reads better, since name → role → handle → meta is
   * a clean descent of 24 → 14 → 13 → 12px rather than a step back up in the middle.
   *
   * NOTHING PASSES IT ON `/u/{username}` YET. `GET /v1/api/profile/professional` reads
   * `SecurityUtils.getCurrentUserId()` and has no by-id variant, so a stranger's job title is not
   * fetchable — see `docs/backend-plan.md` B21. An absent slot takes no room, so that route simply
   * renders one line fewer until the field exists.
   */
  subtitle?: React.ReactNode;
  /**
   * The muted line under the handle: joined date, verified-skill count — facts that qualify the
   * identity without competing with it.
   *
   * SEPARATE FROM `footer` ON PURPOSE, even though both sit below the handle. `footer` is where
   * the uploader reports a failure, and an error has to be the loudest thing in the block for as
   * long as it is there. Sharing one slot would put a red sentence and a grey one in the same
   * flow with no say over which comes first.
   */
  meta?: React.ReactNode;
  /**
   * Drawn over the picture, inside the circle. For `/profile`'s upload button, which needs
   * `absolute inset-0` against the wrapper below.
   */
  avatarOverlay?: React.ReactNode;
  /**
   * Drawn over the cover strip. The band is `relative`, so a control positions itself against it —
   * `ProfileCoverControl` pins to the bottom-right corner.
   *
   * A SLOT RATHER THAN AN `onCoverChange` PROP, for the reason every other slot here is one: this
   * component must not learn what an upload is. `/u/{username}` passes nothing and gets a plain
   * band; `/profile` passes a picker that knows about `features/media` and `useUpdateProfile`,
   * neither of which is named in this file.
   *
   * OUTSIDE THE `aria-hidden` WRAPPER, deliberately. The band itself is decorative and hidden from
   * assistive tech; a button that changes it is not, and nesting it inside would have made the one
   * interactive thing on the strip unreachable to a screen reader.
   */
  coverOverlay?: React.ReactNode;
  /** Hung off the right edge — the message/block pair, or a guest's sign-up prompt. */
  actions?: React.ReactNode;
  /** Under the handle. Currently one thing: the upload's error line. */
  footer?: React.ReactNode;
}

export function ProfileHero({
  name,
  username,
  avatarUrl,
  coverUrl,
  badge,
  subtitle,
  meta,
  avatarOverlay,
  coverOverlay,
  actions,
  footer,
}: ProfileHeroProps) {
  return (
    <Card className="w-full overflow-hidden" padding={0}>
      {/* `aria-hidden`, AND THE IMAGE CARRIES AN EMPTY `alt`, because a cover states nothing the
          page does not state out loud two lines below it. A reader that announces "cover image"
          here has read furniture aloud; one that announces a MinIO filename has read noise.
          Decorative is the correct classification — and with no cover set there is genuinely
          nothing to announce. */}
      <div className="relative h-[96px] w-full sm:h-[128px]">
        {/* The band's paint and the image are `aria-hidden`; `coverOverlay` is a sibling OUTSIDE
            that wrapper so the one interactive thing on the strip stays reachable. */}
        <div className="absolute inset-0 bg-nx-surface-sunken" aria-hidden>
          {coverUrl && (
            /* Plain <img>, for the reason the bookstore's cells write down: the host is MinIO,
               which `next/image` would need configured as a remote pattern before it would touch
               it. `object-cover` because a cover is cropped by definition — it is the one surface
               in the product where the frame, not the file, decides what is seen. */
            // eslint-disable-next-line @next/next/no-img-element -- MinIO host, see comment above
            <img src={coverUrl} alt="" className="size-full object-cover" />
          )}
        </div>
        {coverOverlay}
      </div>

      {/* `sm:items-start`, WHICH REPLACES THE `items-center` THE MERGE SETTLED ON, and the reason
          is the band above rather than a change of mind about the old argument. That argument was
          `center` vs `start` — where to hang a short text stack against a tall circle with nothing
          above it. With a cover, the circle's foot is the line the eye follows out of the picture
          and into the name, so the name sits ON it, and the row's top is the only anchor that does
          not move when the block below the name grows. See the head of the file for the arithmetic
          that pairs this with `-mt-16`. Below `sm` the row is a centred column and `items-center`
          is horizontal centring, which is still what it wants. */}
      <div className="flex flex-col items-center gap-5 px-[var(--nx-space-pad)] py-[var(--nx-space-pad-y)] sm:flex-row sm:items-start">
        {/* `flex`, AND IT IS LOAD-BEARING RATHER THAN TIDINESS. `Avatar` renders an `inline-flex`
            span, so inside a plain block this div sits on a text baseline and the line box adds the
            descender gap under it: the wrapper measured 96 × 103 around a 96 × 96 picture. That is
            not only a stray 7px of layout — this div is what `avatarOverlay` anchors to with
            `absolute inset-0`, so the round overlay was drawn as a 96 × 103 ellipse bleeding below
            the circle it is supposed to cover. Making the wrapper a flex container turns the avatar
            into a flex item, which has no baseline to hang from.

            `group` is here for the overlay's `group-hover:` — the uploader's reveal is its own
            business, but the element it reveals against is this one.

            `-mt-16` is the overlap and `rounded-nx-full ring-4` is the cut-out edge around it; both
            are explained at the head of the file. The rounding is on the WRAPPER and not only on
            `Avatar`, because a ring follows the box it is drawn on — on a square wrapper it would
            be a rounded rectangle around a circle. */}
        <div className="group relative -mt-16 flex shrink-0 rounded-nx-full ring-4 ring-nx-surface-card">
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
          {/* `body-sm` on `text-secondary`, which is what the kit's own hero gives this line —
              secondary rather than muted, because a job title is a fact about the person and not
              a footnote about the record. */}
          {subtitle && <p className="text-nx-body-sm text-nx-text-secondary">{subtitle}</p>}
          {username && (
            <p className="truncate font-mono text-nx-body-sm text-nx-text-muted">@{username}</p>
          )}
          {/* The quietest line in the block, and it must stay that way: `caption` on `muted` puts
              it a step below the handle, so the descent from the name never reverses. */}
          {meta && <p className="text-nx-caption text-nx-text-muted">{meta}</p>}
          {footer}
        </div>

        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </Card>
  );
}
