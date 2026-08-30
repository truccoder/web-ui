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
 * THE `all` TAB IS THE ORIGINAL SCREEN, UNCHANGED: people, then posts, then books, each an
 * unranked section (the backend does substring matching with no relevance score). The narrow tabs
 * add a per-kind view with a filter; Projects and Roadmaps are filtered on this side because
 * `/v1/api/search` does not cover them (`docs/backend-plan.md` B33).
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

function ResultGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="divide-y divide-nx-border-subtle overflow-hidden rounded-nx-lg border border-nx-border-subtle">
      {children}
    </div>
  );
}

function RowSkeletons() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 px-3 py-3">
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

      {/* ── all: the original stacked layout, kept verbatim ───────────────────────────────── */}
      {tab === 'all' &&
        (searchLoading ? (
          <RowSkeletons />
        ) : searchErrored ? (
          errorState
        ) : users.length === 0 && posts.length === 0 && books.length === 0 ? (
          emptyState
        ) : (
          <div className="flex flex-col gap-5">
            {users.length > 0 && (
              <section>
                <SectionHeading
                  icon={<Users className="size-4" />}
                  label={t('search.usersSection', { count: users.length })}
                />
                <ResultGroup>
                  {users.map((user) => (
                    <UserResultCard key={user.id} user={user} />
                  ))}
                </ResultGroup>
              </section>
            )}

            {posts.length > 0 && (
              <section>
                <SectionHeading
                  icon={<FileText className="size-4" />}
                  label={t('search.postsSection', { count: posts.length })}
                />
                <ResultGroup>
                  {posts.map((post) => (
                    <PostResultCard key={post.id} post={post} />
                  ))}
                </ResultGroup>
              </section>
            )}

            {books.length > 0 && (
              <section>
                <SectionHeading
                  icon={<BookOpen className="size-4" />}
                  label={t('search.booksSection', { count: books.length })}
                />
                <ResultGroup>
                  {books.map((book) => (
                    <BookResultCard key={book.id} book={book} />
                  ))}
                </ResultGroup>
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
          <ResultGroup>
            {sortedUsers.map((user) => (
              <UserResultCard key={user.id} user={user} />
            ))}
          </ResultGroup>
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
          <ResultGroup>
            {filteredPosts.map((post) => (
              <PostResultCard key={post.id} post={post} />
            ))}
          </ResultGroup>
        ))}

      {/* ── books ────────────────────────────────────────────────────────────────────────── */}
      {tab === 'books' &&
        (searchLoading ? (
          <RowSkeletons />
        ) : searchErrored ? (
          errorState
        ) : filteredBooks.length === 0 ? (
          emptyState
        ) : (
          <ResultGroup>
            {filteredBooks.map((book) => (
              <BookResultCard key={book.id} book={book} />
            ))}
          </ResultGroup>
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
          <div className="flex flex-col gap-2">
            {projectSearch.truncated && (
              <p className="px-1 text-nx-caption text-nx-text-muted">
                {t('search.projectsTruncated', { count: projectSearch.items.length })}
              </p>
            )}
            <ResultGroup>
              {filteredProjects.map((project) => (
                <ProjectResultCard key={project.id} project={project} />
              ))}
            </ResultGroup>
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
          <ResultGroup>
            {filteredRoadmaps.map((roadmap) => (
              <RoadmapResultCard key={roadmap.id} roadmap={roadmap} />
            ))}
          </ResultGroup>
        ))}
    </div>
  );
}
