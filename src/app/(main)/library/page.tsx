'use client';

import { Suspense } from 'react';
import { Card, Tabs } from '@/shared/components';
import { useTabParam } from '@/shared/lib/use-tab-param';
import { BookLibrary, MyBooksList, PurchasedBooksList } from '@/features/bookstore';
import { useMyProfile } from '@/features/security';
import { useT } from '@/core/i18n';

/**
 * `/library` — the `Thư viện` destination. Owning domain: `bookstore`.
 *
 * IT COULD NOT EXIST BEFORE 2026-08-09. `GET /books` shipped in the backend batch that also
 * unblocked public profiles and appeals; until then the bookstore had no listing endpoint of any
 * kind, so the design system carried this screen with a `GateNote` reading "browse, buy and the
 * reader are all unbuilt". Browse works now, and buy and the reader were already built — they ride
 * along inside `BookActions`, which each card reuses.
 *
 * NO `PageHeader` — the product dropped the pattern app-wide, here included: the rail names every
 * destination already, so a repeated H1 above the tab strip was saying the same thing twice.
 *
 * THREE TABS NOW, MATCHING THE KIT — `Duyệt sách · Sách đã mua · Sách tôi viết`.
 *
 * `Sách đã mua` WAS NOT BUILDABLE UNTIL 01/09/2026 (B37, `docs/backend-plan.md`). There was no
 * endpoint that listed a reader's purchases: `BookController` had the catalogue, one book, an
 * author's books, download, preview, delete and reviews — nothing keyed on the buyer. Filtering
 * the catalogue by `purchased` on this side would have been wrong twice over: it can only judge
 * the page already loaded, and `purchased` is `false` on a free book even for the person who owns
 * it (trap 1 on the `Book` type). `GET /books/purchased` closed the gap, cursor-paged like the
 * catalogue — `PurchasedBooksList` draws it with the exact same `BookCell` the browse tab uses.
 *
 * `Sách tôi viết` MOVED HERE FROM `/profile`. The kit puts it in the library and that is the better
 * home: `/profile` is the account, and a list of books is a shelf, not an account setting. It is
 * the same `MyBooksList` component against the same `GET /books/author/{id}` — moved, not copied,
 * so there is still exactly one place to delete a book from.
 */
const TAB_IDS = ['browse', 'purchased', 'mine'] as const;

export default function LibraryPage() {
  // `useTabParam` reads the query string, which needs a Suspense boundary in the App Router —
  // same shape as `/profile` and `/u/[username]`.
  return (
    <Suspense>
      <LibraryContent />
    </Suspense>
  );
}

function LibraryContent() {
  const t = useT();
  const { data: profile } = useMyProfile();
  const [tab, setTab] = useTabParam(TAB_IDS, 'browse');

  return (
    <div className="flex flex-col gap-[var(--nx-space-section)]">
      {/* A QUERY PARAMETER RATHER THAN ROUTES, unlike `/friends`: those three tabs were three
          existing URLs that people could already be holding links to, and collapsing them into
          one page would have broken those links. These two never had URLs of their own — but
          "no route" was being read as "no URL at all", and the result was that a refresh on
          `Sách tôi viết` dropped the reader back into the catalogue. `?tab=mine` costs nothing
          and is the difference between a shelf you can link someone to and one you cannot.

          The strip is grouped with its panel — 16 down to the content it names — and is now the
          first thing in the canvas, so it takes the canvas's own top rung (`nx-space-section`)
          rather than a rule written against a heading that no longer sits above it. */}
      <div className="flex flex-col gap-[var(--nx-space-group)]">
        {/* THE WHITE CARD UNDER THE STRIP IS `/newsfeed`'s OWN GROUND, carried here. `Tabs`
            itself paints no fill — see its own header — so a strip dropped straight onto the
            page ground (`surface-page`, one step down from card) would sit on bare grey.
            `padding "0 10px"` matches `/newsfeed`'s own strip exactly: horizontal only, `px-2.5`
            — the vertical space comes from each tab's own `py-2.5`, not from a wrapper, so a
            padded top and bottom here would make the strip taller than `/newsfeed`'s. */}
        <Card padding="0 10px" className="flex">
          <Tabs
            aria-label={t('library.title')}
            active={tab}
            onChange={setTab}
            className="flex-1"
            tabs={[
              { id: 'browse', label: t('library.tabs.browse') },
              { id: 'purchased', label: t('library.tabs.purchased') },
              { id: 'mine', label: t('library.tabs.mine') },
            ]}
          />
        </Card>

        {tab === 'browse' ? (
          <BookLibrary />
        ) : tab === 'purchased' ? (
          <PurchasedBooksList />
        ) : (
          <MyBooksList authorId={profile?.id} />
        )}
      </div>
    </div>
  );
}
