'use client';

import { BookOpen, FileText, Users } from 'lucide-react';
import { EmptyState, Skeleton } from '@/shared/components';
import { useT } from '@/core/i18n';
import { cn } from '@/shared/lib/cn';
import { MIN_QUERY_LENGTH, useSearch } from '../hooks';
import { PostResultCard } from './post-result-card';
import { UserResultCard } from './user-result-card';
import { BookResultCard } from './book-result-card';

/**
 * The results for one term: people, then posts, then books.
 *
 * IT OWNS THE QUERY AND TAKES THE TERM. The term belongs to the URL, so it arrives as a prop; the
 * fetching belongs to this feature, so it stays here and `app/(main)/search/page.tsx` never sees
 * a hook. Same division as `ChatMessenger`.
 *
 * PEOPLE FIRST, ALWAYS, and neither list is ranked. The backend does substring matching with no
 * relevance score, so any ordering beyond "what the database returned" would be invented. Fixed
 * section order is the honest presentation of an unranked result set.
 */
export interface SearchResultsProps {
  query: string;
  className?: string;
}

/** Section heading with its icon and count. Both sections are identical but for those. */
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

export function SearchResults({ query, className }: SearchResultsProps) {
  const t = useT();
  const trimmed = query.trim();
  const isQueryable = trimmed.length >= MIN_QUERY_LENGTH;

  const { data, status, fetchStatus } = useSearch(trimmed);

  /**
   * "Type something" is decided by the TERM, not by the query state.
   *
   * A disabled React Query sits at `status: 'pending'` forever, so reading `isPending` here would
   * show a spinner on an empty search box for as long as the page is open. The term is the only
   * thing that distinguishes "nothing asked yet" from "asked and waiting".
   */
  if (!isQueryable) {
    return (
      <div className={className}>
        <EmptyState title={t('search.promptTitle')} description={t('search.prompt')} />
      </div>
    );
  }

  /**
   * THE THREE-STATE BRANCH THAT BIT THIS PROJECT AT P2.6cd, written the way that fixed it.
   *
   * `isLoading ? … : isError ? … : empty` misses a query parked at `status: 'pending'` with
   * `fetchStatus: 'paused'` — both flags read false, and the screen then claims "no results" for a
   * search that never ran. So: skeletons while genuinely fetching, error for anything that is not
   * success, and "no results" **only** on success. The app may not assert emptiness on the
   * backend's behalf.
   */
  if (status === 'pending' && fetchStatus === 'fetching') {
    return (
      <div className={cn('flex flex-col gap-3', className)}>
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

  if (status !== 'success') {
    return (
      <div className={className}>
        <EmptyState title={t('search.errorTitle')} description={t('search.error')} />
      </div>
    );
  }

  const users = data.users ?? [];
  const posts = data.posts ?? [];
  const books = data.books ?? [];

  if (users.length === 0 && posts.length === 0 && books.length === 0) {
    return (
      <div className={className}>
        <EmptyState
          title={t('search.emptyTitle')}
          description={t('search.empty', { query: trimmed })}
        />
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-5', className)}>
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

      {/* BOOKS LAST, and the order is the same argument the file already makes about people
          before posts: there is no ranking to sort by, so the sections are ordered by how
          specific a match is. A person is one row; a post is one document; a book is a whole
          publication and the least likely thing someone typing two words was after. */}
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
  );
}
