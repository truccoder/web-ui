'use client';

import Link from 'next/link';
import { BookOpen, Star } from 'lucide-react';
import {
  ArticleBody,
  CodeSnippetBody,
  LinkBody,
  PollBody,
  PostCard,
  QnaBody,
} from '@/features/posts';
import { useT } from '@/core/i18n';
import { useIntlLocale } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';
import type { SearchBook, SearchPost } from '../types/search';

/**
 * One post in the results — now drawn by `PostCard` itself, the same card the feed and the
 * permalink render.
 *
 * The owner's note was "dùng style có sẵn (của post) thay vì random": this file used to
 * re-implement the identity row, the prose and the footer by hand on a bare `<div>`, which drifted
 * from the real card. `PostCard` takes decomposed props precisely so `features/search` can reuse it
 * (see its own file note), so the job here is just the mapping `SearchPost` → those props.
 *
 * NO ACTION STRIP. `PostDto` carries no reaction summary the reader could act on, no live comment
 * count, and search is a read-only surface — so `actions` and `menu` stay empty and the card omits
 * its footer. The type-specific body is still assembled here because `PostDto` has no `postType`
 * field to switch on: whichever details block came back non-null is the body, and a post has one.
 */
export interface PostResultCardProps {
  post: SearchPost;
  className?: string;
}

/**
 * The book behind a book post. Kept local — `BookBody` from `features/posts` expects the feed's
 * richer book summary, and this one has exactly one caller.
 */
function BookLine({ book }: { book: SearchBook }) {
  const t = useT();
  const localeTag = useIntlLocale();

  const row = (
    <>
      {book.coverImageUrl ? (
        // MinIO presigned URLs expire and are not a configured `next/image` remote pattern.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={book.coverImageUrl}
          alt=""
          className="h-10 w-7 shrink-0 rounded-nx-xs border border-nx-border-subtle object-cover"
        />
      ) : (
        <div className="grid h-10 w-7 shrink-0 place-items-center rounded-nx-xs bg-nx-surface-sunken">
          <BookOpen className="size-3.5 text-nx-text-muted" />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-nx-body-sm font-medium text-nx-text-primary">
          {book.title ?? t('search.untitledBook')}
        </p>

        <div className="flex items-center gap-2 text-nx-caption text-nx-text-muted">
          {book.avgRating !== null && (
            <>
              <span className="flex items-center gap-0.5">
                <Star className="size-2.5 fill-current text-nx-rep" />
                {book.avgRating.toFixed(1)}
              </span>
              <span>·</span>
            </>
          )}

          <span>
            {book.isFree
              ? t('search.free')
              : book.price !== null
                ? t('search.price', { price: book.price.toLocaleString(localeTag) })
                : t('search.priceUnknown')}
          </span>
        </div>
      </div>
    </>
  );

  const base =
    'mt-2 flex items-center gap-2 rounded-nx-md border border-nx-border-subtle px-2 py-2';

  return book.id != null ? (
    <Link
      href={`/books/${book.id}`}
      className={cn(base, 'hover:border-nx-border-strong hover:bg-nx-surface-hover')}
    >
      {row}
    </Link>
  ) : (
    <div className={base}>{row}</div>
  );
}

export function PostResultCard({ post, className }: PostResultCardProps) {
  return (
    <PostCard
      className={className}
      postId={post.id ?? 0}
      author={{
        id: post.authorId ?? 0,
        // `PostDto` carries the handle now, the same field the feed payload grew — so a result
        // reaches its author instead of naming them. Absent keeps the plain-text name.
        username: post.authorUsername,
        fullName: post.authorFullName,
        profilePictureUrl: post.authorProfilePictureUrl,
        eliteScore: post.authorEliteScore,
        levelName: post.authorLevelName,
      }}
      // The DTO is `OffsetDateTime` now (measured at F-C), so no zone-patching — `''` only if the
      // payload genuinely carried nothing, which search does not do.
      createdAt={post.createdAt ?? ''}
      content={post.content}
      // An article's title and summary read before the body copy in `content` — same order as
      // the feed card.
      header={post.articleDetails ? <ArticleBody details={post.articleDetails} /> : undefined}
      body={
        <>
          {/* An event post's title lives in `eventName`; `content` above is its description. */}
          {post.eventName && (
            <p className="text-nx-ui font-medium text-nx-text-primary">{post.eventName}</p>
          )}

          {/* Whichever block the post is built around. `PostDto` has no `postType`, so this cannot
              switch the way the feed's `PostBody` does — it renders whatever came back non-null.
              The quiz is left out on purpose: a search result is for recognising a post, not
              sitting an exam in a card. */}
          {post.codeSnippetDetails && (
            <CodeSnippetBody
              details={post.codeSnippetDetails}
              href={post.id != null ? `/posts/${post.id}` : undefined}
            />
          )}
          {post.qnaDetails && <QnaBody details={post.qnaDetails} />}
          {post.pollDetails && <PollBody details={post.pollDetails} />}
          {post.linkDetails && <LinkBody details={post.linkDetails} />}

          {post.book && <BookLine book={post.book} />}
        </>
      }
    />
  );
}
