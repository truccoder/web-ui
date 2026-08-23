'use client';

import { useState } from 'react';
import { StickyBlock, Tabs } from '@/shared/components';
import { Newsfeed, useRefreshFeed, type FeedScope } from '@/features/newsfeed';
import { PostComposer } from '@/features/posts';
import { useIsGuest } from '@/features/security';
import { useT } from '@/core/i18n';

/**
 * `/newsfeed` — assembled at P3.1, restructured to the round-15 canvas at R4-1.
 *
 * FIVE DOMAINS MEET HERE AND THE PAGE MEDIATES NONE OF THEM. `newsfeed` owns the shell and the
 * payload; `posts` supplies the composer, the card and every body; `bookstore` the book controls;
 * `security` the signed-in identity that decides authorship; `reputation` the Elite Score chip.
 * Only the first two are imported by name — the other three reach the screen through those two
 * barrels, which is exactly what §4 asks for.
 *
 * THE PAGE HAS NO TITLE, AND THAT IS THE DESIGN. Titled screens in this product (`/roadmap`,
 * `/friends`, `Kho lưu trữ`) carry a header because they are places you went to on purpose. The
 * feed is where the app opens; an `h1` reading "Bảng tin" above a column of posts tells the reader
 * something the rail already told them, and costs the fold. The filter takes its place as the
 * canvas's first block, so it — not the composer — sits on the 28px datum shared with the rail's
 * first group and the ledger's first section.
 *
 * THE THIRD TAB EXISTS NOW. It was specified by the design and could not be built: `/feed` took
 * only `page`/`size`, `/posts/public` only a cursor, and `/search` a free-text query — none of
 * them could express "posts touching skills I have". The omission was recorded here rather than
 * papered over with a tab that showed something else. B7 added `scope` to `/feed`, so the tab is
 * one more entry in `TABS` and one more `FeedScope`, exactly as this note predicted.
 *
 * THE TWO TABS ARE TWO ENDPOINTS, not one endpoint filtered — see `Newsfeed`'s `scope` prop.
 */
export default function NewsfeedPage() {
  const t = useT();
  const refreshFeed = useRefreshFeed();
  const [scope, setScope] = useState<FeedScope>('all');

  /**
   * THE SIGNED-OUT FEED IS ONE ENDPOINT, NOT A REDUCED VERSION OF THE OTHER TWO.
   *
   * `Tất cả` is `GET /posts/public` — a query over the posts table, which the backend permits
   * anonymously. `Bạn bè` and `Kỹ năng` are both `GET /feed`, a fan-out precomputed per user in
   * Redis: a guest does not have an empty one, they have none, and there is no user for the
   * `SKILLS` scope to intersect with. Rendering the tabs and letting them fail would offer a
   * reader a choice the product cannot honour, so `scope` stays at its `all` default and the
   * strip that would switch it is not rendered.
   */
  const isGuest = useIsGuest();

  const tabs = [
    { id: 'all', label: t('newsfeed.tabs.all') },
    { id: 'friends', label: t('newsfeed.tabs.friends') },
    { id: 'skills', label: t('newsfeed.tabs.skills') },
  ];

  return (
    // The block rung between canvas blocks. Every gap on this screen is a ladder rung; nothing
    // sets a spacing value of its own.
    <div className="flex flex-col gap-[var(--nx-space-block)]">
      {/**
       * THE FILTER IS A CARD THAT PARKS UNDER THE CHROME, and both halves of that were wrong here.
       *
       * It stuck at `top-0` behind a `z-30` top bar — so scrolling did not park it, it slid the
       * tabs *underneath* the chrome and they vanished. And its fill was `surface-page`, the
       * ground's own colour, so even before it moved it read as no background at all: a strip of
       * ground laid over ground. Both are what the owner reported.
       *
       * The chrome line is `--spacing-nx-topbar`, not zero, and the fill is `surface-card` like
       * every other block on the ground. `StickyBlock` owns the rest — the sentinel, the latch,
       * and R10's rule that a stuck block keeps its shadow and squares only its top two corners.
       *
       * NO HORIZONTAL BLEED ANY MORE, and that removes a whole class of bug rather than fixing
       * one. The old `-mx-4 px-4 lg:mx-0` existed to paint a band wider than the measure; a card
       * is the measure, so it needs no negative margin to keep in step with a responsive canvas
       * padding — which is exactly what had bled 8px past the viewport at 375.
       *
       * `px-2.5` on the tablist is the kit's `0 10px`: the inset split (§5.1) — the bar insets 10
       * and each tab's own 12 completes the line to its label.
       */}
      {/* THE WHOLE STRIP GOES, NOT JUST THE TWO TABS IT CANNOT SERVE. A tablist holding a single
          tab is a control that answers nothing: it takes the datum block, parks itself under the
          chrome and offers a choice of one. With `scope` fixed at `all`, the guest canvas simply
          opens on the public feed, which is the only thing it was ever going to show. */}
      {!isGuest && (
        <StickyBlock>
          {/* THE ONE CALLER THAT IS NOT A PILL. `Tabs` defaults to the pill variant now — a control
            dropped onto a page, occupying as little as it can. This strip is not that: it IS the
            block, a full-measure card parked under the chrome, and a pill group inside it would
            leave the rest of the bar empty. `Tabs`' own header carries the full argument. */}
          <Tabs
            tabs={tabs}
            active={scope}
            onChange={(id) => setScope(id as FeedScope)}
            aria-label={t('newsfeed.tabs.label')}
            variant="underline"
            className="px-2.5"
          />
        </StickyBlock>
      )}

      {/* The composer is the one block on this page with no read-only form. Everything it does is
          a write, and a guest pressing publish would meet the sign-in prompt with a paragraph
          already typed — the invitation belongs before the effort, not after it. `GuestLedger`
          and the top bar carry it. */}
      {!isGuest && <PostComposer onPosted={refreshFeed} />}

      <Newsfeed scope={scope} />
    </div>
  );
}
