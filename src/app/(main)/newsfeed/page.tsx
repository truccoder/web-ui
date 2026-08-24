'use client';

import { Suspense } from 'react';
import { StickyBlock, Tabs } from '@/shared/components';
import { Newsfeed, useRefreshFeed, type FeedScope } from '@/features/newsfeed';
import { PostComposer } from '@/features/posts';
import { useIsGuest } from '@/features/security';
import { TrendingList } from '@/features/trending';
import { useTabParam } from '@/shared/lib/use-tab-param';
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
 * THE FOURTH TAB IS `/trending`, MOVED. Crawled items had a destination of their own in the rail,
 * and it was the wrong shape twice over: a signed-in reader never saw the row (R4 folded crawled
 * content into `Tất cả`, so the page moved to the ⌘K palette and effectively disappeared), while a
 * guest DID see it — promoted into their rail because it was the only other thing they could open.
 * Same content, two different answers, decided by who was asking. As a tab it is one answer for
 * everyone, next to the other three ways of slicing the same column. `/trending` now redirects
 * here.
 *
 * `tech` IS NOT A `FeedScope`, AND THE TYPES SAY SO. The other three tabs choose between two feed
 * ENDPOINTS (see `Newsfeed`'s `scope` prop); this one reads `TrendingController` instead, which is
 * a different feature with its own filters, its own paging and no posts in it at all. So the tab
 * id is a page-level union and the branch below renders a different component, rather than
 * `Newsfeed` growing a scope it cannot fetch.
 */
const TABS = ['all', 'friends', 'skills', 'tech'] as const;
type FeedTab = (typeof TABS)[number];

/**
 * WHAT A SIGNED-OUT READER GETS, AND WHY IT IS TWO ROWS RATHER THAN NONE.
 *
 * `Tất cả` is `GET /posts/public` — a query over the posts table, which the backend permits
 * anonymously — and `Công nghệ` is the crawler's own endpoint, anonymous for the same reason the
 * old `/trending` page was reachable signed out. `Bạn bè` and `Kỹ năng của tôi` are both
 * `GET /feed`, a fan-out precomputed per user in Redis: a guest does not have an empty one, they
 * have none, and there is no user for the `SKILLS` scope to intersect with.
 *
 * THE STRIP USED TO BE HIDDEN ENTIRELY FOR GUESTS, on the argument that "a tablist holding a
 * single tab is a control that answers nothing". That was right when there was one guest-readable
 * tab; there are two now, so the choice is real and the strip earns its place. It is also what
 * pays for the rail losing its promoted `Xu hướng` row — the second thing a guest can open is on
 * the page they land on, instead of being a row in a rail whose other rows are all locked.
 */
const GUEST_TABS: readonly FeedTab[] = ['all', 'tech'];

export default function NewsfeedPage() {
  // `useTabParam` reads the query string, which needs a Suspense boundary in the App Router —
  // same shape as `/library`, `/projects` and `/u/[username]`.
  return (
    <Suspense>
      <NewsfeedContent />
    </Suspense>
  );
}

function NewsfeedContent() {
  const t = useT();
  const refreshFeed = useRefreshFeed();
  const isGuest = useIsGuest();

  /**
   * THE TAB IS IN THE URL NOW, and the fourth tab is what made that necessary rather than nice:
   * `/trending` redirects to `?tab=tech`, which only lands anywhere if the strip reads the query
   * string. It buys the ordinary thing too — a refresh stays where the reader was.
   *
   * `all` IS THE DEFAULT, so the canonical address of the feed stays the bare `/newsfeed` — see
   * the hook, which deletes the parameter rather than writing `?tab=all`.
   */
  const [tabParam, setTab] = useTabParam<FeedTab>(TABS, 'all');

  /**
   * A GUEST ASKING FOR A TAB THEY CANNOT LOAD GETS `Tất cả`, not an error. `?tab=friends` is a
   * perfectly ordinary thing to arrive with — someone signed in shared the link — and the honest
   * answer is the feed they CAN read, not a fan-out that has no rows for a user who does not
   * exist. The URL is left alone; correcting it would rewrite a link the reader may still want
   * after signing in.
   */
  const tabs = isGuest ? GUEST_TABS : TABS;
  const tab = tabs.includes(tabParam) ? tabParam : 'all';

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
        {/* THE ONE CALLER THAT IS NOT A PILL. `Tabs` defaults to the pill variant now — a control
            dropped onto a page, occupying as little as it can. This strip is not that: it IS the
            block, a full-measure card parked under the chrome, and a pill group inside it would
            leave the rest of the bar empty. `Tabs`' own header carries the full argument. */}
        <Tabs
          tabs={tabs.map((id) => ({ id, label: t(`newsfeed.tabs.${id}`) }))}
          active={tab}
          onChange={setTab}
          aria-label={t('newsfeed.tabs.label')}
          variant="underline"
          className="px-2.5"
        />
      </StickyBlock>

      {/* The composer is the one block on this page with no read-only form. Everything it does is
          a write, and a guest pressing publish would meet the sign-in prompt with a paragraph
          already typed — the invitation belongs before the effort, not after it. `GuestLedger`
          and the top bar carry it.

          IT IS ALSO HIDDEN ON `Công nghệ`, where nothing it publishes would appear: that tab is
          the crawler's column and holds no posts by anyone. A composer whose output lands on a
          screen you are not looking at is a control that lies about where it puts things. */}
      {!isGuest && tab !== 'tech' && <PostComposer onPosted={refreshFeed} />}

      {/* `TrendingList` BROUGHT ITS FILTERS WITH IT — source, category and time range — which the
          old rail destination had and the `Tất cả` merge never could. That is the tab's argument
          for existing beside a feed that already mixes these items in: `Tất cả` is the join,
          `Công nghệ` is the stream you can actually narrow. */}
      {tab === 'tech' ? <TrendingList /> : <Newsfeed scope={tab satisfies FeedScope} />}
    </div>
  );
}
