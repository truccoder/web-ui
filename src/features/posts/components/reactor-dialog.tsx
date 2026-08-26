'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Avatar, Dialog, EmptyState, Skeleton, Tabs } from '@/shared/components';
import { getErrorMessage } from '@/shared/lib/api-error';
import { useT } from '@/core/i18n';
import type { ReactionType } from '../types/reaction';
import { useReactors } from '../hooks/use-reaction';
import { REACTIONS } from './reaction-bar';

/**
 * Who reacted to a post.
 *
 * IT ANSWERS A QUESTION THE COUNT ONLY RAISED. `7 cảm xúc` on a card tells a reader that something
 * happened and not who it happened with — and on a product whose reactions are meant to be signals
 * of credibility, *who* found a post useful is most of the information. `GET /posts/{id}/reactions`
 * existed with no caller, so the count was a dead end.
 *
 * ONE OPTION PER TYPE, driven by the endpoint's own `type` parameter rather than by filtering a
 * list on this side. Client-side filtering could only narrow the page already fetched, so the
 * filter would silently under-report as soon as a post had more reactors than one page.
 *
 * A TAB STRIP, AND THIS FILE SHIPPED A `Select` ARGUING AGAINST ONE. Both objections it recorded
 * are kept here because only one of them turned out to be about the control at all:
 *
 * 1. "Eight choices overflow a 480 dialog and the reader has to drag sideways to discover that
 *    `Không đồng tình` exists." True about the WIDTH and false about the consequence — `Tabs`
 *    scrolls itself, fades the edge that has more behind it, and pulls the selected tab into
 *    view (see `useEdgeMask` and the auto-scroll effect there). The overflow was never the thing
 *    that would hide a type; a closed `<select>` showing one line of eight is.
 * 2. "A select says the subject is fixed and this is which slice of it you want." Still a fair
 *    description of the data — but a slice you cannot see until you open a menu is a slice most
 *    readers never learn is there. The seven types ARE this product's argument about reactions
 *    (`Hữu ích · Sáng tỏ · Ghi nhận`, not the Facebook five); putting them behind a chevron
 *    spends the one screen where they are all worth naming.
 *
 * The owner called it, and the shape follows the call: `Tất cả` first — the state the dialog
 * opens in — then the seven in `REACTIONS`, which is the enum's own order and the same order the
 * reaction tray shows.
 *
 * SEVEN GLYPHS AND ONE WORD, which is the second thing the owner called and which settles the
 * width argument for good. `Tất cả` keeps its label because it is not a reaction and has no glyph
 * that could stand for "all of them"; the seven types drop to their icons — the SAME icons the
 * tray and the trigger wear, out of `REACTIONS`, so a reader picks the tab that looks like the
 * button they pressed. The whole strip now fits a phone without scrolling, where eight words did
 * not fit a 480 dialog.
 *
 * THE NAME IS NOT LOST, IT IS MOVED TWICE OVER, and `Tabs` does both moves itself now — see its
 * `iconOnly`. The label goes into an `sr-only` span, so the accessible name of the tab is still
 * `Sáng tỏ`, and the same word becomes the tooltip under the pointer. Neither is optional here:
 * at 16px, `CRY` and `ANGRY` are two circles with slightly different mouths, which is the same
 * reason `ReactionTray` labels its own seven.
 *
 * `iconOnly` ALSO BUYS THE TAP TARGET. A glyph in the strip's word-sized padding is a 24×28 hit
 * area — WCAG 2.2's floor and nothing above it. The flag swaps the box for a 32px square, the
 * same one the acting row's glyph buttons use, and the eight of them still fit a 375 phone
 * without scrolling (326 of ~327). The arithmetic lives on `iconOnlySizeStyles`.
 *
 * `totalCount` CHANGES WITH THE FILTER, not with the post, which is exactly why the dialog's own
 * description reads the total while `ALL` is selected and the list below is what narrows.
 *
 * REACTORS LINK, AND POST AUTHORS STILL DO NOT — the rows are `PublicUserResponse` and carry a
 * `username`, while `FeedPostDataDto` does not (B28). Someone who liked a post is more reachable
 * than the person who wrote it, which is worth noticing rather than smoothing over.
 */
export interface ReactorDialogProps {
  postId: number;
  open: boolean;
  onClose: () => void;
}

export function ReactorDialog({ postId, open, onClose }: ReactorDialogProps) {
  const t = useT();
  const [tab, setTab] = useState<'ALL' | ReactionType>('ALL');

  const type = tab === 'ALL' ? undefined : tab;
  // Nothing is fetched until the dialog is open: a card that loaded this eagerly would put one
  // request per post on every feed render to fill a panel most readers never open.
  const query = useReactors(postId, type, open);

  const rows = query.data?.pages.flatMap((page) => page.reactors ?? []) ?? [];
  const total = query.data?.pages[0]?.totalCount ?? 0;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('post.reactors.title')}
      description={t('post.reactors.count', { count: total })}
      maxHeight="70vh"
    >
      <div className="flex flex-col gap-3">
        {/* `sm`, AND `inline` BY DEFAULT — the strip is a control inside a dialog, not the dialog's
            own header, so it takes the variant that draws no rail across the full measure. `sm`
            keeps `Tất cả` at the 13px rung and leaves the list below as the largest text in the
            panel; the seven glyphs are 16px whatever the size, because the tab's icon slot fixes
            them at `size-4`. */}
        <Tabs
          size="sm"
          aria-label={t('post.reactors.title')}
          active={tab}
          onChange={(id) => setTab(id as 'ALL' | ReactionType)}
          tabs={[
            { id: 'ALL', label: t('post.reactors.all') },
            // The word is passed plainly and `iconOnly` decides what happens to it: hidden from
            // the screen, kept as the accessible name, reused as the tooltip. Writing the
            // `sr-only` span and the `title` by hand here worked and said the same thing twice.
            ...REACTIONS.map(({ type, Icon, labelKey }) => ({
              id: type,
              icon: <Icon />,
              label: t(labelKey),
              iconOnly: true,
            })),
          ]}
        />

        {query.isPending ? (
          <Skeleton lines={3} />
        ) : query.isError ? (
          <p className="text-nx-caption text-nx-status-danger-fg">
            {getErrorMessage(query.error, t('post.reactors.loadError'))}
          </p>
        ) : rows.length === 0 ? (
          <EmptyState compact title={t('post.reactors.empty')} />
        ) : (
          <ul className="flex flex-col">
            {rows.map((user) => {
              /**
               * A ROW WITHOUT A HANDLE IS NOT A LINK — it is not a link that refuses to go
               * anywhere. This used to render `href="#"` with a `preventDefault`, which is a
               * control that looks and tabs like a destination and then swallows the click; the
               * reader learns nothing except that the app is broken. `/u/{username}` is keyed by
               * handle, and the column is nullable for accounts that never set one, so a plain
               * row is the honest shape. The person is still shown — they really did react.
               */
              const href = user.username ? `/u/${encodeURIComponent(user.username)}` : null;

              const inner = (
                <>
                  <Avatar src={user.profilePictureUrl} name={user.fullName} size="md" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-nx-ui text-nx-text-primary">
                      {user.fullName}
                    </span>
                    {user.username && (
                      <span className="block truncate font-mono text-nx-caption text-nx-text-muted">
                        @{user.username}
                      </span>
                    )}
                  </span>
                </>
              );

              return (
                <li key={user.id}>
                  {/* The whole row is the link here, unlike the friends list: there is no second
                      control on it to compete with, so one target is unambiguous. */}
                  {href ? (
                    <Link
                      href={href}
                      className="flex items-center gap-3 rounded-nx-sm px-1 py-2 hover:bg-nx-surface-hover"
                    >
                      {inner}
                    </Link>
                  ) : (
                    <div className="flex items-center gap-3 rounded-nx-sm px-1 py-2">{inner}</div>
                  )}
                </li>
              );
            })}

            {query.hasNextPage && (
              <li className="pt-2">
                <button
                  type="button"
                  onClick={() => query.fetchNextPage()}
                  disabled={query.isFetchingNextPage}
                  className="w-full rounded-nx-sm py-2 text-nx-body-sm text-nx-text-muted hover:bg-nx-surface-hover"
                >
                  {t('post.reactors.loadMore')}
                </button>
              </li>
            )}
          </ul>
        )}
      </div>
    </Dialog>
  );
}
