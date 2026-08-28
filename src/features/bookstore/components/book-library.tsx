'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Badge, EmptyState, Select, Skeleton } from '@/shared/components';
import { cn } from '@/shared/lib/cn';
import { getErrorMessage, getErrorStatus } from '@/shared/lib/api-error';
import { formatPriceParts, useIntlLocale } from '@/shared/lib/format';
import { useT } from '@/core/i18n';
import type { Book, LearningCategory } from '../types/book';
import { useLibrary } from '../hooks';
import { StarRating } from './star-rating';

/**
 * The nine topics, in the backend enum's own order.
 *
 * LISTED RATHER THAN DERIVED, because a TypeScript union has no runtime value to map over — the
 * same reason `TrendingFilters` lists its eight categories. Order matches `LearningCategory.java`
 * so the two never look like different sets, and `OTHER` is last there and last here: it is a real
 * topic holding every row that predates migration V78, not a trailing error case.
 *
 * "EVERY TOPIC" IS NOT IN THIS ARRAY. It is the ABSENCE of the parameter, not a tenth value, so it
 * is prepended in the markup where that is visible.
 */
const CATEGORIES: LearningCategory[] = [
  'BACKEND',
  'FRONTEND',
  'MOBILE',
  'DEVOPS',
  'DATA_ML',
  'SECURITY',
  'QA',
  'CAREER',
  'OTHER',
];

/**
 * The catalogue — every book in the product, newest first.
 *
 * THE SCREEN THIS FEATURE COULD NOT HAVE UNTIL 2026-08-09. `GET /books` did not exist, so for the
 * whole of Phase 2 the only routes to a book were its author's list or a post that embedded it,
 * and the ledger recorded "no `GET /books`" as a ceiling in the same family as "no public profile".
 * `getLibrary` removed it.
 *
 * A TWO-UP GRID, AND THAT REVERSES R4-2's "rows, not a grid".
 *
 * R4-2 argued the decision needs title, price, rating and controls on one line of sight, and that a
 * grid optimises for browsing by picture. Opening the rendered kit settled it the other way: the
 * cards are 330 wide, two to the 672 measure, and every one of those four facts is still on the
 * card — a grid cell is not a cover, it is a narrower row. What the row layout actually bought was
 * a 672-wide band per book, most of it empty, so four books filled a screen that now holds eight.
 *
 * `auto-fit minmax(260px, 1fr)` rather than a fixed two columns: at the 672 measure it resolves to
 * exactly the kit's 330 + 12 + 330, and it folds to one column on a narrow canvas without a
 * breakpoint deciding when.
 *
 * THE CELL CARRIES NO CONTROLS, AND THAT IS WHAT UNCRAMPED IT. The owner reported the two-up grid
 * as *rất chật*; the measured cause was not the column count, which matches the kit exactly, but
 * what we were putting in the column. Ours packed a cover, a two-line title, a price row and
 * `BookActions` — two 32-tall buttons — into 222px of text column. The kit's own cell at the same
 * 330 × 222 holds four readouts and **no button at all**: title · author · stars + `4.3 · 27` ·
 * price + a status pill.
 *
 * That is P3's clause (c) as R9 corrected it, applied honestly: *a row you act on is a unit of
 * work, but a route is not a commit.* Buying and reading are commits, and they belong on the
 * book's own page, which exists (`/books/{id}`) and already reuses `BookActions` — so nothing was
 * lost, it moved one click away and one screen wider. The grid goes back to being a thing you
 * scan.
 *
 * THE WHOLE CELL IS THE LINK NOW, which only became safe once the buttons left: a `<button>`
 * inside an `<a>` is unnested by browsers, and a purchase sharing a click target with a navigation
 * is the kind of ambiguity that gets someone charged. With no control inside, the card is one
 * target for one intent.
 *
 * THE AUTHOR LINE IS ABSENT AND CANNOT BE ADDED HERE. The kit's second row is `Phạm Anh Khoa`;
 * `BookResponseDto` carries `authorId` and no name, and there is no batch user lookup to resolve
 * one per cell without N requests per page. Raised as a backend request — an `authorName` on the
 * DTO closes it with one row of JSX.
 *
 * INFINITE SCROLL, because the endpoint is cursor-paged and reports only `hasMore` — there is no
 * total to render a pager from. Same shape as the feed and the friends list.
 */
export interface BookLibraryProps {
  className?: string;
}

/**
 * The skeleton is the SHAPE OF THE THING LOADING, so it is one cover-shaped block and nothing
 * else. It used to be a card with a small rectangle and two text bars — which described the old
 * row layout, and would now promise a shelf that does not arrive.
 */
function BookRowSkeleton() {
  return <Skeleton className="aspect-[2/3] w-full rounded-nx-md" />;
}

export function BookLibrary({ className }: BookLibraryProps) {
  const t = useT();
  const localeTag = useIntlLocale();

  /**
   * COMPONENT STATE, NOT A QUERY PARAMETER, and that is a smaller claim than the tab beside it.
   * `?tab=mine` exists because a reader lands on `Sách tôi viết` and reloads; a topic is a pass
   * over the same shelf rather than a place, and the page already owns one search param. If the
   * owner asks for linkable topics, `useTabParam` is the shape to reach for.
   */
  const [category, setCategory] = useState<LearningCategory | undefined>(undefined);

  const library = useLibrary(category);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = library;

  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = sentinelRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage();
      },
      { rootMargin: '200px' }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  /**
   * THE 503 GETS ITS OWN SENTENCE, IN THE READER'S LANGUAGE.
   *
   * `getErrorMessage` returns whatever the backend wrote, and for this endpoint that is
   * `Failed to generate download URL` — English, in a Vietnamese product, on the one screen a
   * reader hits when the book storage is misconfigured. The cause is known and documented on
   * `bookApi.getBook`: building the DTO presigns a URL per book, so a single unreachable object
   * store fails the whole catalogue.
   *
   * MATCHED ON STATUS, NOT ON THE MESSAGE TEXT — see `getErrorStatus`. Everything that is not a
   * 503 still shows the backend's own words, because those are the ones that carry the specifics
   * and inventing copy for failures we have not seen would be guessing.
   */
  const errorMessage = library.isError
    ? getErrorStatus(library.error) === 503
      ? t('library.storageError')
      : getErrorMessage(library.error, t('library.loadError'))
    : null;

  const books = library.data?.pages.flatMap((page) => page.items) ?? [];

  /**
   * THE FILTER STAYS ON SCREEN THROUGH EVERY STATE, WHICH IS WHY THIS FUNCTION STOPPED RETURNING
   * EARLY. Loading, the 503 and the empty shelf each used to return their own tree; with a topic
   * selected, that would take the control away at exactly the moment it is needed — a reader who
   * picks a topic with nothing in it would be left on an empty screen with no way back to `Tất cả`
   * short of reloading the page.
   */
  return (
    <div className={cn('flex flex-col gap-[var(--nx-space-group)]', className)}>
      <Select
        size="sm"
        // `w-fit` — the field is as wide as its longest topic, not as wide as the shelf. `Select`
        // sizes its wrapper `w-full` unless told otherwise; see `wrapperClassName` there.
        wrapperClassName="w-fit"
        aria-label={t('library.categoryLabel')}
        value={category ?? ''}
        // '' IS "EVERY TOPIC" IN THE DOM AND `undefined` ON THE WIRE. An `<option>` value is
        // always a string, and sending an empty `category=` is a 400 — the backend rejects
        // anything outside the enum on purpose. The conversion happens here, once.
        onChange={(event) =>
          setCategory((event.target.value || undefined) as LearningCategory | undefined)
        }
        options={[
          { value: '', label: t('library.allCategories') },
          ...CATEGORIES.map((option) => ({
            value: option,
            label: t(`learningCategory.${option}`),
          })),
        ]}
      />

      {library.isLoading ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-[var(--nx-space-element)]">
          {Array.from({ length: 4 }).map((_, i) => (
            <BookRowSkeleton key={i} />
          ))}
        </div>
      ) : errorMessage !== null ? (
        <p className="text-nx-caption text-nx-status-danger-fg">{errorMessage}</p>
      ) : books.length === 0 ? (
        /* TWO EMPTY STATES, BECAUSE THEY MEAN DIFFERENT THINGS. An empty catalogue is a product
           that has no books yet; an empty topic is a shelf with books on it, none of them this
           kind — and the reader's next move is to pick another topic, not to wait. */
        <EmptyState
          title={category ? t('library.emptyCategoryTitle') : t('library.emptyTitle')}
          description={category ? t('library.emptyCategoryDesc') : t('library.emptyDesc')}
        />
      ) : (
        <div>
          {/* 12 between cells — the kit's own grid gap, measured on its library screen. */}
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-[var(--nx-space-element)]">
            {books.map((book) => (
              <li key={book.id}>
                <BookCell book={book} localeTag={localeTag} />
              </li>
            ))}
          </ul>

          <div ref={sentinelRef} />

          {isFetchingNextPage && (
            <div className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-[var(--nx-space-element)]">
              <BookRowSkeleton />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * ONE BOOK — THE COVER IS THE CARD.
 *
 * This was a 54×74 thumbnail pinned to the left of a text column inside a filled card. The
 * owner's verdict was that it read as an unbalanced split, and they are right about why: a
 * cover at that size is too small to be the subject and too large to be an icon, so the cell
 * had two competing subjects and settled on neither.
 *
 * A book IS its cover — that is what the object is for, and it is how every shelf, every store
 * and every reader recognises one. So the cover takes the whole cell at a real book ratio, and
 * the words arrive on a veil over it when the reader points at one. The design system's own
 * README (round 5.1) puts the book grid among its four "bare" sets — no fill, no border, hover
 * only — and an image that fills its cell settles that argument by making the surrounding fill
 * unnecessary rather than by choosing a side.
 *
 * NOTHING MOVES OR SCALES ON HOVER (§2.1). The veil changes opacity and nothing else: no lift,
 * no zoom on the cover.
 *
 * THE VEIL IS NOT HOVER-ONLY, and that is not a nicety. A touch screen has no hover, so a
 * title that only appears on pointer-over does not exist on a phone; `@media (hover: none)`
 * pins it open. `focus-within` does the same for the keyboard, so tabbing through the shelf
 * says which book has focus.
 */
function BookCell({ book, localeTag }: { book: Book; localeTag: string }) {
  const t = useT();
  const [coverFailed, setCoverFailed] = useState(false);
  const showCover = Boolean(book.coverImageUrl?.trim()) && !coverFailed;

  const price =
    book.isFree || book.price == null
      ? { amount: t('post.book.free'), symbol: '' }
      : formatPriceParts(book.price, book.currency?.trim() || 'VND', localeTag);

  const cover = showCover ? (
    // Plain <img>: the host is MinIO and the URL is presigned, so `next/image` would need a
    // remote pattern for a URL that expires anyway.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={book.coverImageUrl ?? undefined}
      alt=""
      className="size-full object-cover"
      onError={() => setCoverFailed(true)}
    />
  ) : (
    /* A placeholder that says "no cover", not "broken": an empty grey rectangle reads as a
       failed image. The title's initial is the cheapest signal that something is deliberately
       standing in for the artwork, and it doubles as an identifier when scanning a shelf. */
    <div className="grid size-full place-items-center bg-nx-surface-sunken" aria-hidden>
      <span className="text-nx-display font-semibold text-nx-text-faint">
        {book.title?.trim()?.charAt(0)?.toUpperCase() || '?'}
      </span>
    </div>
  );

  const cell = (
    <>
      {/* 2/3 is the book ratio, not a guess — it is what a paperback cover measures, so a real
          cover fills the frame instead of being letterboxed inside it. */}
      <div className="aspect-[2/3] w-full overflow-hidden rounded-nx-md bg-nx-surface-sunken">
        {cover}
      </div>

      <div
        className={cn(
          // `inset-x-0 top-0` + the cover's own aspect: the veil covers the ARTWORK, not
          // the title line that now sits below it.
          'absolute inset-x-0 top-0 aspect-[2/3] flex flex-col justify-end gap-[var(--nx-space-tight)]',
          'rounded-nx-md p-[var(--nx-space-element)]',
          // The gradient, not a flat scrim: a flat one dims the artwork it is there to sit on.
          // The bottom third is opaque, though — that is the band the facts actually sit on, and
          // over a bright cover a 0.72 stop let enough through to grey the text out.
          'bg-gradient-to-t from-[rgba(16,24,32,0.97)] from-30% via-[rgba(16,24,32,0.82)] via-60% to-transparent',
          'opacity-0 transition-opacity duration-[var(--nx-duration-fast)] ease-nx-out',
          'group-hover:opacity-100 group-focus-within:opacity-100',
          // No hover to give: show it. See the note above.
          '[@media(hover:none)]:opacity-100'
        )}
      >
        {/* THREE STACKED ROWS — stars, then the score, then the price — rather than stars+score on
            one line. Each fact gets its own baseline, and the price ends up alone on the last row
            where it reads as the headline it is. */}
        {book.reviewCount && book.avgRating ? (
          <span className="flex flex-col gap-[var(--nx-space-pair)]">
            {/* THE VEIL IS DARK IN BOTH THEMES, so the stars take theme-stable ink classes rather
                than their defaults — `text-nx-text-primary` is near-black in light mode and would
                vanish here. Same reason the price row below uses `nx-brand-ink-*`. */}
            <StarRating
              rating={book.avgRating}
              size={12}
              filledClassName="text-nx-brand-ink-text"
              emptyClassName="text-nx-brand-ink-muted"
            />
            <span className="font-mono text-nx-micro tabular-nums text-nx-brand-ink-muted">
              {book.avgRating.toFixed(1)} · {book.reviewCount}
            </span>
          </span>
        ) : null}

        <span className="flex flex-wrap items-center gap-x-[var(--nx-space-tight)] gap-y-[var(--nx-space-pair)]">
          {/* THE DIGITS ARE MONO, THE CURRENCY SYMBOL IS NOT — mono is for numbers (§6.5) and a
              currency mark is not one. The symbol itself is `đ` rather than `₫`: measured in the
              live document, `₫` has no glyph in EITHER Geist face and fell back, which is why
              splitting the spans alone did not fix it. See `withDongGlyph` in `shared/lib`.

              BIGGER THAN THE ROWS ABOVE IT — `body` semibold against the 11px score line — because
              price is the fact a buyer scans a shelf for. */}
          <span className="flex items-baseline gap-[var(--nx-space-pair)]">
            <span className="font-mono text-nx-body font-semibold tabular-nums text-nx-brand-ink-text">
              {price.amount}
            </span>
            {price.symbol && (
              <span className="text-nx-body-sm text-nx-brand-ink-text">{price.symbol}</span>
            )}
          </span>

          {/* `isFree` FIRST: the backend computes `purchased` as `!isFree && …`, so a free book
              reports `purchased: false` even to its own author. And a free book already says
              "Miễn phí" in the price slot, so the old duplicate pill is gone — it printed the
              same word twice, half a centimetre apart. */}
          {!book.isFree && book.purchased ? (
            <Badge variant="success">{t('library.owned')}</Badge>
          ) : null}
        </span>
      </div>

      {/* THE TITLE IS PERMANENT, AND THAT IS A CORRECTION MADE BY LOOKING AT IT.
          The brief was "title on hover", which is right when a cover is artwork — you recognise
          a book by its art and the words would only cover it up. Screenshotted against the real
          shelf, the covers here are flat colour fields with no lettering, so a hover-only title
          turned the whole page into a grid of coloured rectangles: nothing on it could be read
          without pointing at it one cell at a time, on the one surface whose entire job is
          scanning. So the title sits under its cover where it can always be read, and the veil
          keeps what it is genuinely good at — the facts you only want when you are considering
          one book: what it costs, how it was rated, whether you already own it. */}
      <p className="mt-[var(--nx-space-tight)] line-clamp-2 text-nx-body-sm font-medium text-nx-text-primary">
        {book.title}
      </p>
    </>
  );

  // The route is the cell's only interaction, so it takes the whole cell. `group` is what the
  // veil's hover and focus states hang off.
  return book.id != null ? (
    <Link
      href={`/books/${book.id}`}
      aria-label={book.title ?? undefined}
      className="group relative block rounded-nx-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring"
    >
      {cell}
    </Link>
  ) : (
    <div className="group relative block">{cell}</div>
  );
}
