'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Avatar, Dialog, EmptyState, Select, Skeleton } from '@/shared/components';
import { getErrorMessage } from '@/shared/lib/api-error';
import { useT } from '@/core/i18n';
import type { ReactionType } from '../types/reaction';
import { useReactors } from '../hooks/use-reaction';
import { REACTION_ORDER } from './reaction-bar';

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
 * A `Select`, AND IT WAS A TAB STRIP UNTIL IT WAS COUNTED. Eight choices — `Tất cả` plus seven
 * reaction types — inside a dialog that is 480 wide at most. Even in Vietnamese, where the labels
 * are short, that is a strip which overflows and scrolls sideways ON DESKTOP, and the reader has
 * to drag through it to discover that `Phẫn nộ` exists at all. A tab strip is a control you can
 * take in at a glance; past three or four options it stops being one, and this had eight.
 *
 * IT IS ALSO NOT NAVIGATION, WHICH IS THE PART THE SHAPE WAS GETTING WRONG. The dialog is about
 * one thing — who reacted — and the type only narrows that list. Tabs claim the panels are
 * different subjects; a select says the subject is fixed and this is which slice of it you want,
 * which is the truth here.
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
        {/* `sm:w-56` RATHER THAN THE WRAPPER'S DEFAULT `w-full`. A filter stretched to the dialog's
            full measure reads as the dialog's subject; the subject is the list under it. On a
            phone it goes full width anyway, because a native picker's tap target should be. */}
        <Select
          size="sm"
          wrapperClassName="sm:w-56"
          aria-label={t('post.reactors.title')}
          value={tab}
          onChange={(event) => setTab(event.target.value as 'ALL' | ReactionType)}
          options={[
            { value: 'ALL', label: t('post.reactors.all') },
            ...REACTION_ORDER.map((value) => ({
              value,
              label: t(`post.reaction.${value}`),
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
