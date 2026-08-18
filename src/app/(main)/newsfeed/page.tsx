'use client';

import { useState } from 'react';
import { StickyBlock, Tabs } from '@/shared/components';
import { Newsfeed, useRefreshFeed, type FeedScope } from '@/features/newsfeed';
import { PostComposer } from '@/features/posts';
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
 * THE FILTER HAS TWO TABS, NOT THE DESIGN'S THREE. `Kỹ năng của tôi` is specified and is not built:
 * no endpoint filters posts by the viewer's verified skills. `/feed` takes only `page`/`size`,
 * `/posts/public` only `cursor`/`limit`, and `/search` takes a free-text query — none of them can
 * express "posts touching skills I have". Rendering it anyway would either show an empty tab or
 * silently show something else, and the design system's own rule is that a control must reach what
 * it names. Recorded as a deviation and raised as a backend request; the day a skill filter exists
 * it is one more entry in `TABS` and one more `FeedScope`.
 *
 * THE TWO TABS ARE TWO ENDPOINTS, not one endpoint filtered — see `Newsfeed`'s `scope` prop.
 */
export default function NewsfeedPage() {
  const t = useT();
  const refreshFeed = useRefreshFeed();
  const [scope, setScope] = useState<FeedScope>('all');

  const tabs = [
    { id: 'all', label: t('newsfeed.tabs.all') },
    { id: 'friends', label: t('newsfeed.tabs.friends') },
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
      <StickyBlock>
        <Tabs
          tabs={tabs}
          active={scope}
          onChange={(id) => setScope(id as FeedScope)}
          aria-label={t('newsfeed.tabs.label')}
          className="px-2.5"
        />
      </StickyBlock>

      <PostComposer onPosted={refreshFeed} />

      <Newsfeed scope={scope} />
    </div>
  );
}
