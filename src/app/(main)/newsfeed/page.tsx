'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { SquarePen } from 'lucide-react';
import { IconButton, StickyBlock, Tabs } from '@/shared/components';
import { Newsfeed, useRefreshFeed, type FeedScope } from '@/features/newsfeed';
import { PostComposer, PostTypeMenu, type PostComposerHandle } from '@/features/posts';
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
 * THE `skills` TAB EXISTS NOW. It was specified by the design and could not be built: `/feed` took
 * only `page`/`size`, `/posts/public` only a cursor, and `/search` a free-text query — none of
 * them could express "posts touching skills I have". The omission was recorded here rather than
 * papered over with a tab that showed something else. B7 added `scope` to `/feed`, so the tab is
 * one more entry in `TABS` and one more `FeedScope`, exactly as this note predicted.
 *
 * `Công nghệ` IS `/trending`, MOVED — AND IT LEADS. Crawled items had a destination of their own in
 * the rail, and it was the wrong shape twice over: a signed-in reader never saw the row (R4 folded
 * crawled content into the feed, so the page moved to the ⌘K palette and effectively disappeared),
 * while a guest DID see it — promoted into their rail because it was the only other thing they
 * could open. Same content, two different answers, decided by who was asking. As a tab it is one
 * answer for everyone, and it is the DEFAULT: the bare `/newsfeed` opens on the stream nobody has
 * to be connected to anyone to have, and the community feeds sit behind `?tab=`. `/trending`
 * redirects here.
 *
 * `Tất cả` USED TO LEAD, AND IT IS GONE. It was `GET /posts/public` with the crawler's items
 * merged in by `publishedAt` on the client — and that merge threw away `TrendingController`'s own
 * ranking (hotness / per-source percent rank) to interleave by raw recency, so the same items were
 * ordered one way here and another way on `Công nghệ`. The owner called the inconsistency out.
 * `Bài viết` replaces it as `GET /posts/public` ALONE — every post in the product, no crawled
 * content, no re-sort. Crawled items live only on `Công nghệ` now, where the ranking is the
 * backend's and the filters can narrow it.
 *
 * `tech` IS NOT A `FeedScope`, AND THE TYPES SAY SO. The other three tabs choose between two feed
 * ENDPOINTS (see `Newsfeed`'s `scope` prop); this one reads `TrendingController` instead, which is
 * a different feature with its own filters, its own paging and no posts in it at all. So the tab
 * id is a page-level union and the branch below renders a different component, rather than
 * `Newsfeed` growing a scope it cannot fetch.
 */
const TABS = ['tech', 'posts', 'friends', 'skills'] as const;
type FeedTab = (typeof TABS)[number];

/**
 * WHAT A SIGNED-OUT READER GETS, AND WHY IT IS TWO ROWS RATHER THAN NONE.
 *
 * `Công nghệ` is the crawler's own endpoint, anonymous for the same reason the old `/trending`
 * page was reachable signed out, and `Bài viết` is `GET /posts/public` — a query over the posts
 * table, which the backend permits anonymously. `Bạn bè` and `Kỹ năng của tôi` are both
 * `GET /feed`, a fan-out precomputed per user in Redis: a guest does not have an empty one, they
 * have none, and there is no user for the `SKILLS` scope to intersect with.
 *
 * THE STRIP USED TO BE HIDDEN ENTIRELY FOR GUESTS, on the argument that "a tablist holding a
 * single tab is a control that answers nothing". That was right when there was one guest-readable
 * tab; there are two now, so the choice is real and the strip earns its place. It is also what
 * pays for the rail losing its promoted `Xu hướng` row — the second thing a guest can open is on
 * the page they land on, instead of being a row in a rail whose other rows are all locked.
 */
const GUEST_TABS: readonly FeedTab[] = ['tech', 'posts'];

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
   * THE TAB IS IN THE URL NOW, and `Công nghệ` is what made that necessary rather than nice:
   * `/trending` redirects to `?tab=tech`, which only lands anywhere if the strip reads the query
   * string. It buys the ordinary thing too — a refresh stays where the reader was.
   *
   * `tech` IS THE DEFAULT, so the canonical address of the feed stays the bare `/newsfeed` — see
   * the hook, which deletes the parameter rather than writing `?tab=tech`.
   */
  const [tabParam, setTab] = useTabParam<FeedTab>(TABS, 'tech');

  /**
   * A GUEST ASKING FOR A TAB THEY CANNOT LOAD GETS `Công nghệ`, not an error. `?tab=friends` is a
   * perfectly ordinary thing to arrive with — someone signed in shared the link — and the honest
   * answer is a stream they CAN read, not a fan-out that has no rows for a user who does not
   * exist. The URL is left alone; correcting it would rewrite a link the reader may still want
   * after signing in.
   */
  const tabs = isGuest ? GUEST_TABS : TABS;
  const tab = tabs.includes(tabParam) ? tabParam : 'tech';

  /**
   * THE COMPOSER SCROLLS AWAY AND THE FILTER BAR DOES NOT, SO THE FILTER BAR CARRIES THE WAY BACK
   * TO IT. Reported by the owner: past the first screen of the feed there is nowhere to write.
   *
   * WHY NOT A FLOATING BUTTON, the obvious answer. The surface model forbids it in as many words
   * — *nothing in flow may appear to float* — and it is the rule that retired `ChatDock` from the
   * whole product at R15 (see the shell's closing note). Re-introducing a floating layer here to
   * fix a scroll problem would spend a system-wide decision on one screen.
   *
   * WHY NOT STICK THE COMPOSER ITSELF. It is a 68px card and the filter is a 44px bar; parking
   * both under a 56px chrome puts 112px of permanently fixed furniture over a 672 measure, and on
   * a 390×844 phone that is a sixth of the viewport spent on a control most people touch once a
   * session — the exact cost R5-2 turned the composer into a launcher to avoid.
   *
   * SO IT IS ONE ICON ON A BAR THAT IS ALREADY THERE, and it opens the very same dialog the card
   * below opens, on the very same draft — see `PostComposerHandle` for why that is a handle and
   * not a lifted `open` prop. No new layer, no new vertical budget, and the draft is one object.
   */
  const composerRef = useRef<PostComposerHandle>(null);
  const composerCardRef = useRef<HTMLDivElement>(null);
  const [composerOffscreen, setComposerOffscreen] = useState(false);

  // `tech` has no composer at all (nothing it publishes would land there) and a guest never gets
  // one, so on those the bar has nothing to offer and the button is not rendered.
  const hasComposer = !isGuest && tab !== 'tech';

  /**
   * The button appears only once the card it stands in for has passed UNDER THE CHROME — the same
   * `-56px` line `StickyBlock` latches on, so the icon arrives on the frame the composer leaves
   * rather than at some unrelated scroll offset.
   *
   * A sentinel is not needed here the way it is in `StickyBlock`: the composer card does not
   * restyle when it crosses the line, so observing it directly is not observing an effect of the
   * thing being detected.
   */
  useEffect(() => {
    // No reset on the way out, deliberately: nothing renders `composerOffscreen` while there is
    // no composer, and `IntersectionObserver` delivers an initial callback on `observe`, so the
    // value is re-derived from the real geometry the moment one comes back.
    if (!hasComposer) return;

    const element = composerCardRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => setComposerOffscreen(!entries[0].isIntersecting),
      { rootMargin: '-56px 0px 0px 0px', threshold: 0 }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [hasComposer]);

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
        {/* `items-stretch` IS WHAT KEEPS THE HAIRLINE WHOLE. The `underline` tablist draws its own
            `border-b` and that line running the full measure is the entire reason the variant
            exists; putting a control beside it would have ended the line early. The control's own
            box repeats the same border, so the two meet and read as one rail. */}
        <div className="flex items-stretch">
          {/* THE ONE CALLER THAT IS NOT A PILL. `Tabs` defaults to the pill variant now — a
              control dropped onto a page, occupying as little as it can. This strip is not that:
              it IS the block, a full-measure card parked under the chrome, and a pill group inside
              it would leave the rest of the bar empty. `Tabs`' own header carries the full
              argument.

              `min-w-0` because the strip is an `overflow-x-auto` scroller: without it a flex item
              refuses to shrink below its content, so at 390 the four Vietnamese labels would push
              the compose button off the bar instead of scrolling under it. */}
          <Tabs
            tabs={tabs.map((id) => ({ id, label: t(`newsfeed.tabs.${id}`) }))}
            active={tab}
            onChange={setTab}
            aria-label={t('newsfeed.tabs.label')}
            variant="underline"
            className="min-w-0 flex-1 px-2.5"
          />

          {hasComposer && (
            // `pb-px` matches the tablist's own, so both borders land on the same pixel row.
            <div className="flex shrink-0 items-center border-b border-nx-border-subtle pr-2.5 pl-2 pb-px">
              {/**
               * THE BOX IS RESERVED, THE CONTROL COMES AND GOES INSIDE IT. `size-7` is exactly the
               * `sm` icon button, so the bar's geometry never changes: the button is the only
               * thing between the tabs and the right edge, and letting its width come and go would
               * hand it back to a `flex-1` scroller and slide every tab label sideways — a layout
               * shift, on scroll, under the reader's pointer.
               *
               * IT UNMOUNTS RATHER THAN FADING TO `opacity-0`, WHICH IS A CORRECTION. Hiding by
               * opacity left the menu MOUNTED, and its panel is portalled into `document.body` —
               * so a panel opened at the bottom of the feed stayed fully painted and fully
               * clickable after scrolling back to the top, floating over a bar that had gone
               * invisible underneath it. Nothing about `pointer-events-none` on the trigger
               * reaches a panel that is no longer inside it. Unmounting takes the portal with it.
               */}
              <div className="size-7">
                {composerOffscreen && (
                  /**
                   * IT OPENS THE TYPE LIST, NOT THE DIALOG, and that is the difference between
                   * this control and the field-shaped button on the card below. That field says
                   * what it will do — you can read your own draft in it — so pressing it may as
                   * well go straight in. One icon at the end of a filter bar says nothing about
                   * what kind of post is waiting on the other side, and dropping someone into
                   * whichever form the composer happened to be left on is a surprise they did not
                   * ask for. The menu is the answer to "what am I about to write", and it is the
                   * same menu the card has.
                   *
                   * `align="end"` so the panel hangs from the right edge it is anchored to rather
                   * than opening off the measure.
                   *
                   * `portal` BECAUSE THE BAR CLIPS. `StickyBlock` sets `overflow-hidden` so its
                   * tab scroller keeps inside the rounded corners, and an absolutely positioned
                   * panel inside an `overflow: hidden` box is cut off at that box's edge —
                   * pressing the icon showed a sliver of menu and nothing else. Clipping happens
                   * before stacking, so no z-index reaches it; the panel has to be somewhere the
                   * bar is not.
                   */
                  <PostTypeMenu
                    portal
                    align="end"
                    onSelect={(type) => composerRef.current?.open(type)}
                    className="animate-[nx-fade_var(--nx-duration-fast)_var(--ease-nx-out)]"
                    trigger={
                      <IconButton size="sm" label={t('newsfeed.composeInBar')}>
                        <SquarePen />
                      </IconButton>
                    }
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </StickyBlock>

      {/* The composer is the one block on this page with no read-only form. Everything it does is
          a write, and a guest pressing publish would meet the sign-in prompt with a paragraph
          already typed — the invitation belongs before the effort, not after it. `GuestLedger`
          and the top bar carry it.

          IT IS ALSO HIDDEN ON `Công nghệ`, where nothing it publishes would appear: that tab is
          the crawler's column and holds no posts by anyone. A composer whose output lands on a
          screen you are not looking at is a control that lies about where it puts things. */}
      {hasComposer && (
        // The wrapper exists for the `IntersectionObserver` above — `PostComposer` renders a
        // `Card` and forwards no DOM ref, and the one ref it DOES take is the imperative handle.
        <div ref={composerCardRef}>
          <PostComposer ref={composerRef} onPosted={refreshFeed} />
        </div>
      )}

      {/* `TrendingList` BROUGHT ITS FILTERS WITH IT — source, category and time range — which the
          old rail destination had. It keeps `TrendingController`'s own ranking; `Bài viết` is a
          separate stream (`GET /posts/public`) with no crawled content in it at all. */}
      {tab === 'tech' ? <TrendingList /> : <Newsfeed scope={tab satisfies FeedScope} />}
    </div>
  );
}
