'use client';

import { useState } from 'react';
import { Tabs } from '@/shared/components';
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
      {/* STICKY, and the sticky is the part worth reading twice. `position: sticky` leaves the
          element in normal flow horizontally — only its paint position moves — so it keeps the
          canvas's own centring for free, with no second mechanism to hold in agreement with the
          first. A fixed overlay would have to reproduce the scroller's gutter reserve by hand.

          `-mt-7` cancels the canvas's own top padding while stuck: the 28 above the first block
          is ground between the chrome and the content, and when the first block becomes the
          chrome's neighbour there is no such relationship left to space. */}
      <div className="sticky top-0 z-20 -mx-6 -mt-7 bg-nx-surface-page px-6 pt-7">
        <Tabs
          tabs={tabs}
          active={scope}
          onChange={(id) => setScope(id as FeedScope)}
          aria-label={t('newsfeed.tabs.label')}
        />
      </div>

      <PostComposer onPosted={refreshFeed} />

      <Newsfeed scope={scope} />
    </div>
  );
}
