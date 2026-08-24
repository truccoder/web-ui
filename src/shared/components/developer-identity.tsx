import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/shared/lib/cn';
import { Avatar, type AvatarProps } from './avatar';

/**
 * Hand-written from the design system's `DeveloperIdentity.d.ts` + `.prompt.md` contract.
 * No design-system source was read.
 *
 * THE canonical identity row. The prompt is explicit that no surface may re-implement this
 * locally — a post header, a comment header and a profile row are the same object at
 * different sizes, so they are the same component here.
 *
 * Order is fixed doctrine and must not be rearranged:
 *   avatar → name → reputation → [time] / role → handle
 *
 * DEVIATION, structural: the DS takes `score?: number` and renders the RepScore chip
 * itself. Here reputation arrives as a `rep` **slot** instead. `RepScore` belongs to
 * `features/reputation`, and `shared/` may not import a feature (CLAUDE.md §4 — that is
 * exactly how `shared/` turns into the next global bucket). The caller, which is already
 * inside a feature, passes `<RepScore score={…} size="sm" />` in. Visually identical; the
 * dependency points the legal way.
 *
 * DEVIATION, scope: `expertise?: string[]` → ExpertiseTag pills is not built. No endpoint
 * returns verified expertise for a user — not the feed payload, not search, not
 * `/profile/me` — so there is nothing to render but invented labels, which the WBS forbids.
 * Add the prop and the pill together when a real source exists.
 */
export interface DeveloperIdentityProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string;
  /**
   * Reputation slot — pass `features/reputation`'s `RepScore`. Omit to hide it, which is
   * also the honest thing to do when the payload carries no Elite Score.
   */
  rep?: React.ReactNode;
  /** Role line, e.g. "Backend Engineer · Fintech". */
  role?: string;
  /** Mono handle, e.g. "@minh.tran". */
  handle?: string;
  /**
   * Right-aligned mono timestamp on the name line.
   *
   * `ReactNode`, NOT `string`, so a caller can make it the post's permalink. A timestamp that
   * links to the thing it timestamps is the one anchor a card can carry without adding a control:
   * it is already there, it is already the least-interesting text on the row, and it is where
   * every reader has been trained to look for "this specific post".
   */
  time?: React.ReactNode;
  /** Single mono metadata line that REPLACES role + handle. */
  meta?: string;
  /** md = feed/article header · sm = compact rows (comments, panels). @default "md" */
  size?: 'sm' | 'md';
  /**
   * Overrides the picture size `size` would pick, WITHOUT touching the two text lines.
   *
   * IT EXISTED BRIEFLY FOR THE FEED AND WAS REMOVED WITH IT; it is back because comments need
   * exactly the thing it does. `size` is a type-scale switch — it moves the name from `body-sm` to
   * `ui` and the picture with it — so asking for a bigger face through `size` also grows the name,
   * and a comment's name is already the right size. One prop, one axis.
   *
   * Left undefined everywhere else, so every other caller keeps the picture it had.
   */
  avatarSize?: AvatarProps['size'];
  /**
   * Puts `time` on the SECOND line, under the name, instead of pinned to the right of it.
   *
   * WHY IT IS A CHOICE AND NOT THE ONLY LAYOUT. On a comment the row is `name … time`, and the
   * right edge is empty, so the timestamp has the line to itself and reads as an attribute of the
   * row. On a post card the same right edge already holds the `⋯` menu, and the timestamp ends up
   * pressed against it — two unrelated things at the same weight in the same corner, which is what
   * the owner reported. Under the name it belongs to the byline it describes.
   *
   * The second line also drops it to `caption` from the name row's `micro` mono — smaller, and no
   * longer competing with the name it sits below.
   *
   * @default false
   */
  timeBelow?: boolean;
  /**
   * The person's page. Makes the AVATAR and the NAME links to it; everything else on the row
   * stays inert.
   *
   * TWO LINKS RATHER THAN ONE AROUND THE ROW, and that is the whole design of this prop. The
   * friends list can wrap the entire identity in an anchor because nothing else lives inside
   * it — a post card cannot, because `time` is already the post's own permalink and an anchor
   * inside an anchor is invalid HTML that browsers silently unnest. So the two things a reader
   * actually aims at when they mean "who is this" get the link, and the timestamp keeps
   * pointing at the post.
   *
   * Omit for a row whose person has no reachable page — the payload carries no handle, or the
   * row is about the reader themselves. The name then renders as plain text, exactly as before.
   */
  href?: string;
  /** Avatar image url. */
  src?: string;
  /** Presence dot on the avatar. */
  status?: 'online' | 'busy' | 'offline';
}

/**
 * Mono micro-metadata: timestamps, handles, counts.
 *
 * Exported separately because the DS does — surfaces need the same treatment for a stray
 * "· 3 replies" that is not part of a full identity row.
 */
export function DeveloperMeta({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={cn('font-mono text-nx-micro text-nx-text-muted', className)} {...props} />
  );
}

export function DeveloperIdentity({
  name,
  rep,
  role,
  handle,
  time,
  meta,
  size = 'md',
  avatarSize,
  timeBelow = false,
  href,
  src,
  status,
  className,
  ...props
}: DeveloperIdentityProps) {
  // `meta` replaces role + handle entirely (the article-byline form), so the second line is
  // one branch, never both.
  const secondLine = meta ?? [role, handle].filter(Boolean).join(' · ');
  // `timeBelow` only moves the timestamp when the second line is otherwise free. A caller that
  // supplies both gets the original layout rather than one silently dropped.
  const timeUnderName = timeBelow && !secondLine ? time : undefined;

  /**
   * The focus ring the two links share. Written once because the avatar and the name are the
   * same target said twice, and a reader tabbing through must not see two different rings.
   */
  const linkRing = cn(
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring'
  );

  const nameClass = cn(
    'truncate font-semibold text-nx-text-primary',
    size === 'sm' ? 'text-nx-body-sm' : 'text-nx-ui'
  );

  const avatar = (
    <Avatar
      src={src}
      name={name}
      size={avatarSize ?? (size === 'sm' ? 'sm' : 'lg')}
      status={status}
    />
  );

  return (
    <div className={cn('flex items-start gap-2.5', className)} {...props}>
      {/* THE AVATAR LINK IS THE SAME DESTINATION AS THE NAME, so it is hidden from the keyboard
          and from a screen reader rather than offered twice — `aria-hidden` + `tabIndex={-1}` is
          the standard fix for a redundant adjacent link, and the picture says nothing the name
          beside it does not. A mouse still gets the target it expects. */}
      {href ? (
        <Link
          href={href}
          className={cn('shrink-0 rounded-nx-full', linkRing)}
          aria-hidden
          tabIndex={-1}
        >
          {avatar}
        </Link>
      ) : (
        avatar
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {/* THE ANCHOR *IS* THE NAME, not a wrapper around it. `truncate` is `overflow:hidden`,
              which does nothing to an inline element — so a `<span class="truncate">` inside an
              `<a>` stops truncating and a long name shoves the rep chip and the timestamp off
              the row. Putting the classes on the anchor (a blockified flex item) keeps the
              ellipsis working. */}
          {href ? (
            <Link href={href} className={cn(nameClass, 'min-w-0 hover:underline', linkRing)}>
              {name}
            </Link>
          ) : (
            <span className={nameClass}>{name}</span>
          )}

          {rep}

          {/* Pushed right on its own rather than with a spacer element: the name may be long
              enough to truncate, and `ml-auto` keeps the timestamp pinned either way. */}
          {time && !timeUnderName && (
            <DeveloperMeta className="ml-auto shrink-0">{time}</DeveloperMeta>
          )}
        </div>

        {timeUnderName && (
          <div className="mt-0.5 text-nx-caption text-nx-text-muted">{timeUnderName}</div>
        )}

        {secondLine && (
          <div
            className={cn(
              'truncate',
              // A `meta` line is mono by spec; a role/handle line is prose with the handle
              // reading as an identifier, so the whole line stays sans at caption size.
              meta
                ? 'font-mono text-nx-micro text-nx-text-muted'
                : 'text-nx-caption text-nx-text-secondary'
            )}
          >
            {secondLine}
          </div>
        )}
      </div>
    </div>
  );
}
