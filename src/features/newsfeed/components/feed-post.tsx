'use client';

import { useState } from 'react';
import {
  ArticleBody,
  BookBody,
  CodeSnippetBody,
  CommentThread,
  EventBody,
  EventCalendarActions,
  EventRsvpBar,
  LinkBody,
  PollBody,
  PostCard,
  PostEditor,
  PostMenu,
  QnaBody,
  QuizTaker,
  ReactionBar,
  type PostEditorState,
} from '@/features/posts';
import { BookActions } from '@/features/bookstore';
import { useMyProfile } from '@/features/security';
import { Button } from '@/shared/components';
import { useT } from '@/core/i18n';
import type { FeedPost as FeedPostData } from '../types/feed';

/**
 * One feed entry: maps `FeedPostDataDto` onto the `features/posts` read-side components.
 *
 * THIS FILE IS THE SEAM, AND IT NOW SITS ON THE RIGHT SIDE OF IT. `PostCard` takes decomposed
 * props rather than the feed DTO (decided at P2.4′c-1): that DTO belongs to the backend package
 * `com.socialapp.newsfeed`, so binding the card to it would point posts -> newsfeed, the wrong
 * way round, and would stop `features/search` reusing the card for the same post shape under a
 * different DTO. The mapping therefore belongs to whoever holds the payload — this feature,
 * which since P2.5 is where the payload's type lives too.
 *
 * TWO THINGS THE FEED OWNS THAT THE CARD MUST NOT:
 *  - whether the comment thread is mounted. `CommentThread` fetches on mount and has no
 *    `collapsed` prop on purpose, so twenty cards rendering it unconditionally would be
 *    twenty requests on page load. Opening it is state that lives here, per card.
 *  - what "changed" means. Reactions and comments call `onChanged` so the holder of the
 *    payload can refresh it; posts hooks never invalidate another domain's cache
 *    (CLAUDE.md §4), so `onChanged` is wired to the feed's own invalidation.
 */

export interface FeedPostProps {
  post: FeedPostData;
  /** Refetch the feed — the payload's counts only move when it is re-fetched. */
  onChanged: () => void;
}

/**
 * The post's full present state, for `PostEditor`.
 *
 * EVERY KEY IS WRITTEN OUT BECAUSE OMITTING ONE DESTROYS IT. `PostService.updatePost` runs
 * `BeanUtils.copyProperties`, which copies nulls, so a field missing from the request is
 * wiped from the stored post. `PostEditorState` makes every key mandatory precisely so this
 * function cannot compile until each one has been considered — measured at P2.4'c-4, where a
 * partial map wiped a real post's `quiz_details` and its accepted answer.
 *
 * `images` and `taggedUserIds` are the two that cannot be preserved: `UpdatePostRequestDto`
 * accepts them but `FeedPostDataDto` never echoes them back, so there is nothing to send and
 * an edit nulls them. Harmless today (nothing in this app writes either field) and not
 * fixable here — the backend has to echo them.
 */
function toEditorState(post: FeedPostData): PostEditorState {
  return {
    // `?? undefined` because the payload types content as nullable now: a post with no prose
    // arrives as null, and the update DTO takes a string or nothing. Harmless either way here —
    // `PostEditor` overwrites this key with the textarea value before sending.
    content: post.content ?? undefined,
    visibility: post.visibility,
    googlePlaceId: post.googlePlaceId ?? undefined,
    locationType: post.locationType ?? undefined,
    locationDetails: post.locationDetails ?? undefined,
    codeSnippetDetails: post.codeSnippetDetails ?? undefined,
    articleDetails: post.articleDetails ?? undefined,
    qnaDetails: post.qnaDetails ?? undefined,
    pollDetails: post.pollDetails ?? undefined,
    linkDetails: post.linkDetails ?? undefined,
    quizDetails: post.quizDetails ?? undefined,
    images: undefined,
    taggedUserIds: undefined,
  };
}

/**
 * The type-specific body. Kept as a plain switch here rather than inside `PostCard`, which
 * renders whatever body it is handed and never inspects `postType` — that is what lets the
 * same card serve search results later.
 *
 * `BOOK`'S ACTIONS COME FROM `features/bookstore`, THROUGH ITS BARREL. Buy / preview / reviews
 * belong to that domain, and until P2.10 its only implementation was a legacy bridge under
 * `src/components/posts/`, which a feature must never import — so the actions arrived as a render
 * prop threaded down from the page. `features/bookstore` now exists, and CLAUDE.md §4 permits one
 * feature to import another's `index.ts`, so the import is direct and the prop is gone. Same shape
 * as `features/chat` importing `features/friendships` (settled at P2.7c-1). The dependency
 * newsfeed → bookstore is real — the feed genuinely renders book posts — and §4 is explicit that a
 * real coupling should be expressed through the barrel rather than hidden behind an indirection.
 */
function PostBody({ post, onChanged }: { post: FeedPostData; onChanged: () => void }) {
  switch (post.postType) {
    case 'CODE_SNIPPET':
      return post.codeSnippetDetails ? <CodeSnippetBody details={post.codeSnippetDetails} /> : null;
    case 'ARTICLE':
      return post.articleDetails ? <ArticleBody details={post.articleDetails} /> : null;
    case 'QNA':
      return post.qnaDetails ? <QnaBody details={post.qnaDetails} /> : null;
    case 'POLL':
      return post.pollDetails ? <PollBody details={post.pollDetails} /> : null;
    case 'LINK':
      return post.linkDetails ? <LinkBody details={post.linkDetails} /> : null;
    case 'EVENT':
      return post.eventDetails ? (
        <EventBody
          details={post.eventDetails}
          actions={
            <>
              <EventRsvpBar
                postId={post.postId}
                maxAttendees={post.eventDetails.maxAttendees}
                onChanged={onChanged}
              />
              <EventCalendarActions postId={post.postId} title={post.eventDetails.eventTitle} />
            </>
          }
        />
      ) : null;
    case 'BOOK':
      return post.book ? (
        <BookBody
          book={post.book}
          actions={
            // `bookId` is the one field these controls cannot work without, and the feed's book
            // summary types every field as optional. No id means no actions rather than a broken
            // control.
            post.book.bookId != null ? (
              <BookActions
                bookId={post.book.bookId}
                title={post.book.title ?? ''}
                fileFormat={post.book.fileFormat ?? null}
                isFree={post.book.isFree === true}
              />
            ) : null
          }
        />
      ) : null;
    default:
      // REGULAR carries no details block — its whole body is the card's `content`.
      return null;
  }
}

export function FeedPost({ post, onChanged }: FeedPostProps) {
  const t = useT();
  const { data: profile } = useMyProfile();

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  const isAuthor = profile?.id === post.authorId;

  // Accept-answer is offered only to the author of a QNA post: `PostService.acceptAnswer`
  // throws for anyone else. It is no longer one-way — `DELETE /qna/accept-answer` exists — so
  // this same flag now gates both directions, and `CommentThread` decides which of the two it
  // is offering from `acceptedAnswerId`.
  const canAcceptAnswer = isAuthor && post.postType === 'QNA';

  // `googlePlaceId`/`locationType`/`locationDetails` travel together on the resolve response
  // and the card's `location` prop is that same shape, so it is only built when all three
  // survived the round trip; a partial location renders as a badge that links nowhere.
  const location =
    post.googlePlaceId && post.locationType && post.locationDetails
      ? {
          googlePlaceId: post.googlePlaceId,
          locationType: post.locationType,
          locationDetails: post.locationDetails,
          googleMapsUrl: post.googleMapsUrl ?? undefined,
        }
      : undefined;

  return (
    <PostCard
      postId={post.postId}
      author={{
        id: post.authorId,
        fullName: post.authorFullName,
        profilePictureUrl: post.authorProfilePictureUrl,
        eliteScore: post.authorEliteScore,
        // Both are embedded in the feed payload, so the card never calls the reputation
        // endpoint — and the level name is READ, never derived from the score (CLAUDE.md §1).
        levelName: post.authorLevelName,
      }}
      createdAt={post.createdAt}
      // While editing, the stored text is inside the editor's textarea; showing it above as
      // static copy too would put the same sentence on screen twice.
      content={editing ? undefined : post.content}
      location={location}
      hashtags={post.hashtags}
      postType={post.postType}
      // `commentCount` and `likeCount` are live again. They were withheld from P2.4'd until
      // F-A because `fanOutPost` never set either and no comment or reaction path touched the
      // cached entry, so both were the `int` default of 0 on every post — and "0 comments"
      // printed directly above a comment the reader can see reads as broken, where a missing
      // number only reads as not-supplied.
      //
      // The backend now keeps them current. Measured on the live feed at F-A, not taken on
      // trust: a post carrying one real comment answers `"commentCount":1`.
      commentCount={post.commentCount}
      menu={
        isAuthor ? (
          <PostMenu postId={post.postId} onEdit={() => setEditing(true)} onDeleted={onChanged} />
        ) : undefined
      }
      body={
        <>
          {editing ? (
            <PostEditor
              postId={post.postId}
              current={toEditorState(post)}
              onDone={() => setEditing(false)}
              onSaved={onChanged}
            />
          ) : (
            <PostBody post={post} onChanged={onChanged} />
          )}

          {/* A quiz is an attachment, not a post type — `buildAndSavePost` accepts
              `quizDetails` regardless of `postType` — so it renders after whatever body the
              post has rather than as one of the cases above. */}
          {post.quizDetails && <QuizTaker postId={post.postId} quiz={post.quizDetails} />}
        </>
      }
      actions={
        <>
          <div className="flex flex-wrap items-center gap-2">
            <ReactionBar postId={post.postId} count={post.likeCount} onChanged={onChanged} />
            <Button
              size="sm"
              variant="ghost"
              aria-expanded={commentsOpen}
              onClick={() => setCommentsOpen((open) => !open)}
            >
              {commentsOpen ? t('post.comments.hide') : t('post.comments.show')}
            </Button>
          </div>

          {/* Mounted only when open: see the note at the top of this file. */}
          {commentsOpen && (
            <CommentThread
              postId={post.postId}
              onChanged={onChanged}
              canAcceptAnswer={canAcceptAnswer}
              acceptedAnswerId={post.qnaDetails?.acceptedAnswerId}
            />
          )}
        </>
      }
    />
  );
}
