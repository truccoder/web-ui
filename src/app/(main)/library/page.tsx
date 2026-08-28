'use client';

import { Suspense } from 'react';
import { Tabs } from '@/shared/components';
import { useTabParam } from '@/shared/lib/use-tab-param';
import { BookLibrary, MyBooksList } from '@/features/bookstore';
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
 * A TITLED SCREEN, unlike `/newsfeed`. The feed is where the app opens and its header would be
 * telling the reader something the rail already said; the library is somewhere you went on purpose,
 * so it names itself and says what it holds.
 *
 * TWO TABS, WHERE THE KIT DRAWS THREE — `Duyệt sách · Sách đã mua ② · Sách tôi viết`.
 *
 * `Sách đã mua` IS NOT BUILT, and the reason is not that it was overlooked. There is no endpoint
 * that lists a reader's purchases: `BookController` has the catalogue, one book, an author's books,
 * download, preview, delete and reviews — nothing keyed on the buyer. Filtering the catalogue by
 * `purchased` on this side would be wrong twice over: it can only judge the page already loaded,
 * and `purchased` is `false` on a free book even for the person who owns it (trap 1 on the `Book`
 * type). A tab that silently under-reports what you own is worse than a tab that is not there.
 *
 * `Sách tôi viết` MOVED HERE FROM `/profile`. The kit puts it in the library and that is the better
 * home: `/profile` is the account, and a list of books is a shelf, not an account setting. It is
 * the same `MyBooksList` component against the same `GET /books/author/{id}` — moved, not copied,
 * so there is still exactly one place to delete a book from.
 */
const TAB_IDS = ['browse', 'mine'] as const;

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
      <div>
        <h1 className="text-nx-title font-semibold tracking-tight text-nx-text-primary">
          {t('library.title')}
        </h1>
        <p className="mt-1 text-nx-body-sm text-nx-text-muted">{t('library.subtitle')}</p>
      </div>

      {/* A QUERY PARAMETER RATHER THAN ROUTES, unlike `/friends`: those three tabs were three
          existing URLs that people could already be holding links to, and collapsing them into
          one page would have broken those links. These two never had URLs of their own — but
          "no route" was being read as "no URL at all", and the result was that a refresh on
          `Sách tôi viết` dropped the reader back into the catalogue. `?tab=mine` costs nothing
          and is the difference between a shelf you can link someone to and one you cannot.

          The strip is grouped with its panel: 16 down to the content it names, the page's own 40
          up to the heading. It used to sit 40 from both. */}
      <div className="flex flex-col gap-[var(--nx-space-group)]">
        <Tabs
          aria-label={t('library.title')}
          active={tab}
          onChange={setTab}
          tabs={[
            { id: 'browse', label: t('library.tabs.browse') },
            { id: 'mine', label: t('library.tabs.mine') },
          ]}
        />

        {tab === 'browse' ? <BookLibrary /> : <MyBooksList authorId={profile?.id} />}
      </div>
    </div>
  );
}
