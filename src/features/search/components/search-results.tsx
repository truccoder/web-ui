'use client';

import { useState } from 'react';
import { BookOpen, FileText, Users } from 'lucide-react';
import { EmptyState, Skeleton, Tabs } from '@/shared/components';
import { useT } from '@/core/i18n';
import { useTabParam } from '@/shared/lib/use-tab-param';
import { cn } from '@/shared/lib/cn';
import { MIN_QUERY_LENGTH, useProjectSearch, useRoadmapSearch, useSearch } from '../hooks';
import { SEARCH_TABS, type SearchTab } from '../lib/tabs';
import { derivePostKind, presentPostKinds } from '../lib/post-kind';
import { PostResultCard } from './post-result-card';
import { UserResultCard } from './user-result-card';
import { BookResultCard } from './book-result-card';
import { ProjectResultCard } from './project-result-card';
import { RoadmapResultCard } from './roadmap-result-card';
import { DEFAULT_FILTERS, SearchFilters, type SearchFiltersState } from './search-filters';

/**
 * The results for one term.
 *
 * IT OWNS THE QUERY AND TAKES THE TERM. The term belongs to the URL, so it arrives as a prop; the
 * fetching belongs to this feature, so it stays here and `app/(main)/search/page.tsx` never sees
 * a hook. Same division as `ChatMessenger`.
 *
 * IT ALSO OWNS THE TAB AND THE FILTERS. `?tab=` goes through `useTabParam` (the hook `/library`
 * uses) so a reload lands on the same panel and the existing `?q=` survives; the per-tab filters
 * are plain `useState`, the same call `RoadmapList` makes — a control that narrows a list it did
 * not fetch does not need to be a shareable URL.
 *
 * EACH KIND IS DRAWN BY ITS OWN DOMAIN'S CARD, not a bespoke row in a bordered group (owner's
 * note, "dùng style có sẵn … thay vì random"): people get the friends-tab person card, posts get
 * `PostCard`, books get the `/library` cover cell in a grid, projects get the board's `ProjectCard`
 * and roadmaps get the roadmap-index `Card`. This component only lays them out.
 */
export interface SearchResultsProps {
  query: string;
  className?: string;
}

/** Section heading with its icon and count. */
function SectionHeading({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <p className="flex items-center gap-2 px-1 py-1 text-nx-body-sm font-medium text-nx-text-secondary">
      {icon}
      {label}
    </p>
  );
}

/** A column of cards — people, posts, projects. The gap is the block rung the feed and the
    project board use between cards. */
function CardColumn({ children }: { children: React.ReactNode }) {
  return <ul className="flex flex-col gap-[var(--nx-space-block)]">{children}</ul>;
}

/** The book grid — `auto-fill minmax(150px, …)`, the same track `/library` lays covers on. */
function BookGrid({ children }: { children: React.ReactNode }) {
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-[var(--nx-space-element)]">
      {children}
    </ul>
  );
}

/** The roadmap grid — `auto-fit minmax(260px, …)`, matching `RoadmapList`. */
function RoadmapGrid({ children }: { children: React.ReactNode }) {
  return <ul className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-3">{children}</ul>;
}

function RowSkeletons() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 rounded-nx-md bg-nx-surface-card px-5 py-4"
        >
          <Skeleton circle height={40} />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton width={160} height={12} />
            <Skeleton width={220} height={10} />
          </div>
        </div>
      ))}
    </div>
  );
}

function BookGridSkeletons() {
  return (
    <BookGrid>
      {Array.from({ length: 6 }).map((_, index) => (
        <li key={index}>
          <Skeleton className="aspect-[2/3] w-full rounded-nx-md" />
        </li>
      ))}
    </BookGrid>
  );
}

export function SearchResults({ query, className }: SearchResultsProps) {
  const t = useT();
  const trimmed = query.trim();
  const isQueryable = trimmed.length >= MIN_QUERY_LENGTH;

  const [tab, setTab] = useTabParam(SEARCH_TABS, 'all');
  const [filters, setFilters] = useState<SearchFiltersState>(DEFAULT_FILTERS);

  const { data, status, fetchStatus } = useSearch(trimmed);
  const projectSearch = useProjectSearch(trimmed, isQueryable && tab === 'projects');
  const roadmapSearch = useRoadmapSearch(trimmed, isQueryable && tab === 'roadmaps');

  /**
   * "Type something" is decided by the TERM, not by the query state. A disabled React Query sits
   * at `status: 'pending'` forever, so reading `isPending` here would show a spinner on an empty
   * search box for as long as the page is open.
   */
  if (!isQueryable) {
    return (
      <div className={className}>
        <EmptyState title={t('search.promptTitle')} description={t('search.prompt')} />
      </div>
    );
  }

  /**
   * THE THREE-STATE BRANCH THAT BIT THIS PROJECT AT P2.6cd. `isLoading ? … : isError ? … : empty`
   * misses a query parked at `status: 'pending'` with `fetchStatus: 'paused'`, which then claims
   * "no results" for a search that never ran. So: fetching, not-success, success — and emptiness
   * is asserted only on success.
   */
  const searchLoading = status === 'pending' && fetchStatus === 'fetching';
  const searchReady = status === 'success';
  const searchErrored = !searchLoading && !searchReady;

  const users = data?.users ?? [];
  const posts = data?.posts ?? [];
  const books = data?.books ?? [];

  const postKinds = presentPostKinds(posts);

  // Counts for the tab pills. Undefined until the source has actually answered, so a pill shows a
  // number or nothing — never a misleading 0 while a fetch is still in flight.
  const counts: Partial<Record<SearchTab, number>> = {
    people: searchReady ? users.length : undefined,
    posts: searchReady ? posts.length : undefined,
    books: searchReady ? books.length : undefined,
    projects:
      tab === 'projects' && !projectSearch.isLoading && !projectSearch.isError
        ? projectSearch.items.length
        : undefined,
    roadmaps:
      tab === 'roadmaps' && !roadmapSearch.isLoading && !roadmapSearch.isError
        ? roadmapSearch.items.length
        : undefined,
  };

  const errorState = <EmptyState title={t('search.errorTitle')} description={t('search.error')} />;
  const emptyState = (
    <EmptyState
      title={t('search.emptyTitle')}
      description={t('search.empty', { query: trimmed })}
    />
  );

  const sortedUsers =
    filters.peopleSort === 'rep'
      ? [...users].sort((a, b) => (b.eliteScore ?? 0) - (a.eliteScore ?? 0))
      : users;

  const filteredPosts =
    filters.postKind === 'all'
      ? posts
      : posts.filter((post) => derivePostKind(post) === filters.postKind);

  const filteredBooks = books.filter((book) => {
    if (filters.bookPrice === 'free') return book.isFree === true || book.price === 0;
    if (filters.bookPrice === 'paid') return !book.isFree && (book.price ?? 0) > 0;
    return true;
  });

  const filteredProjects =
    filters.projectStatus === 'all'
      ? projectSearch.items
      : projectSearch.items.filter((p) => p.status === filters.projectStatus);

  const filteredRoadmaps =
    filters.roadmapCategory === 'all'
      ? roadmapSearch.items
      : roadmapSearch.items.filter((r) => r.category === filters.roadmapCategory);

  return (
    <div className={cn('flex flex-col gap-[var(--nx-space-group)]', className)}>
      <Tabs
        aria-label={t('search.title')}
        active={tab}
        onChange={setTab}
        tabs={SEARCH_TABS.map((id) => ({ id, label: t(`search.tabs.${id}`), count: counts[id] }))}
      />

      <SearchFilters tab={tab} postKinds={postKinds} value={filters} onChange={setFilters} />

      {/* ── all: people, then posts, then books, each an unranked section ──────────────────── */}
      {tab === 'all' &&
        (searchLoading ? (
          <RowSkeletons />
        ) : searchErrored ? (
          errorState
        ) : users.length === 0 && posts.length === 0 && books.length === 0 ? (
          emptyState
        ) : (
          <div className="flex flex-col gap-[var(--nx-space-section)]">
            {/* `section` rung between the three groups — a people card, a post card and a book
                grid are genuinely different kinds of thing, and 20px let them read as one list. */}
            {users.length > 0 && (
              <section>
                <SectionHeading
                  icon={<Users className="size-4" />}
                  label={t('search.usersSection', { count: users.length })}
                />
                <CardColumn>
                  {users.map((user) => (
                    <li key={user.id}>
                      <UserResultCard user={user} />
                    </li>
                  ))}
                </CardColumn>
              </section>
            )}

            {posts.length > 0 && (
              <section>
                <SectionHeading
                  icon={<FileText className="size-4" />}
                  label={t('search.postsSection', { count: posts.length })}
                />
                <CardColumn>
                  {posts.map((post) => (
                    <li key={post.id}>
                      <PostResultCard post={post} />
                    </li>
                  ))}
                </CardColumn>
              </section>
            )}

            {books.length > 0 && (
              <section className="flex flex-col gap-[var(--nx-space-tight)]">
                <SectionHeading
                  icon={<BookOpen className="size-4" />}
                  label={t('search.booksSection', { count: books.length })}
                />
                <BookGrid>
                  {books.map((book) => (
                    <li key={book.id}>
                      <BookResultCard book={book} />
                    </li>
                  ))}
                </BookGrid>
              </section>
            )}
          </div>
        ))}

      {/* ── people ───────────────────────────────────────────────────────────────────────── */}
      {tab === 'people' &&
        (searchLoading ? (
          <RowSkeletons />
        ) : searchErrored ? (
          errorState
        ) : sortedUsers.length === 0 ? (
          emptyState
        ) : (
          <CardColumn>
            {sortedUsers.map((user) => (
              <li key={user.id}>
                <UserResultCard user={user} />
              </li>
            ))}
          </CardColumn>
        ))}

      {/* ── posts ────────────────────────────────────────────────────────────────────────── */}
      {tab === 'posts' &&
        (searchLoading ? (
          <RowSkeletons />
        ) : searchErrored ? (
          errorState
        ) : filteredPosts.length === 0 ? (
          emptyState
        ) : (
          <CardColumn>
            {filteredPosts.map((post) => (
              <li key={post.id}>
                <PostResultCard post={post} />
              </li>
            ))}
          </CardColumn>
        ))}

      {/* ── books ────────────────────────────────────────────────────────────────────────── */}
      {tab === 'books' &&
        (searchLoading ? (
          <BookGridSkeletons />
        ) : searchErrored ? (
          errorState
        ) : filteredBooks.length === 0 ? (
          emptyState
        ) : (
          <BookGrid>
            {filteredBooks.map((book) => (
              <li key={book.id}>
                <BookResultCard book={book} />
              </li>
            ))}
          </BookGrid>
        ))}

      {/* ── projects (client-filtered, B33) ──────────────────────────────────────────────── */}
      {tab === 'projects' &&
        (projectSearch.isLoading ? (
          <RowSkeletons />
        ) : projectSearch.isError ? (
          errorState
        ) : filteredProjects.length === 0 ? (
          emptyState
        ) : (
          <div className="flex flex-col gap-[var(--nx-space-tight)]">
            {projectSearch.truncated && (
              <p className="px-1 text-nx-caption text-nx-text-muted">
                {t('search.projectsTruncated', { count: projectSearch.items.length })}
              </p>
            )}
            <CardColumn>
              {filteredProjects.map((project) => (
                <li key={project.id}>
                  <ProjectResultCard project={project} />
                </li>
              ))}
            </CardColumn>
          </div>
        ))}

      {/* ── roadmaps (client-filtered, B33) ──────────────────────────────────────────────── */}
      {tab === 'roadmaps' &&
        (roadmapSearch.isLoading ? (
          <RowSkeletons />
        ) : roadmapSearch.isError ? (
          errorState
        ) : filteredRoadmaps.length === 0 ? (
          emptyState
        ) : (
          <RoadmapGrid>
            {filteredRoadmaps.map((roadmap) => (
              <li key={roadmap.id}>
                <RoadmapResultCard roadmap={roadmap} />
              </li>
            ))}
          </RoadmapGrid>
        ))}
    </div>
  );
}
