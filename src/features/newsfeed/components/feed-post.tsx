'use client';

import { useState, type ReactNode } from 'react';
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
import { useMyProfile } from '@/features/security';
import { Button } from '@/shared/components';
import { useT } from '@/lib/i18n';
import type { FeedBookSummary, FeedPost as FeedPostData } from '../types/feed';

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
  /** Buy / preview / review controls for a `BOOK` post; see `PostBody`. */
  renderBookActions?: (book: FeedBookSummary) => ReactNode;
}

/**
 * Post kinds whose defining block the feed payload does not carry, so an edit made from here
 * would delete it.
 *
 * MEASURED IN THE CACHE, NOT INFERRED: `NewsfeedService.fanOutPost` builds `FeedPostDataDto`
 * with `eventDetails` and `book` only — `codeSnippetDetails`, `articleDetails`, `qnaDetails`,
 * `pollDetails`, `linkDetails` and `quizDetails` are never copied onto it, and every cached
 * entry in Redis has all six as `null`. Since `updatePost` writes the whole object and copies
 * nulls, saving an edit of, say, a POLL from the feed would leave a POLL post with no poll.
 *
 * `EVENT` and `BOOK` are absent from this list deliberately: their blocks are not on
 * `UpdatePostRequestDto` at all, so no request can touch them. `REGULAR` has no block.
 *
 * The quiz attachment is the one hole this cannot close — any kind may carry `quizDetails`,
 * and since the payload always says `null` there is no way to tell a post that has one from a
 * post that does not. Editing a REGULAR post with a quiz still drops the quiz. The fix is in
 * the backend: `fanOutPost` has to copy the six fields it declares.
 */
const KINDS_WITH_UNECHOED_DETAILS = new Set(['CODE_SNIPPET', 'ARTICLE', 'QNA', 'POLL', 'LINK']);

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
 * `BOOK` IS THE ONE BODY THIS FEATURE CANNOT FINISH. Buy / preview / reviews belong to
 * `bookstore`, which has not been rebuilt yet (P2.10), and its temporary implementation still
 * lives in `src/components/posts/book-post-actions.tsx`. Importing that from here would put a
 * legacy path inside a feature and fail the extraction test (CLAUDE.md §4), so it arrives as a
 * render prop from the page instead. When `features/bookstore` exists, the page swaps the
 * bridge for its component — or this file imports it through that feature's barrel — and the
 * prop can go.
 */
function PostBody({
  post,
  onChanged,
  renderBookActions,
}: {
  post: FeedPostData;
  onChanged: () => void;
  renderBookActions?: (book: FeedBookSummary) => ReactNode;
}) {
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
        <BookBody book={post.book} actions={renderBookActions?.(post.book)} />
      ) : null;
    default:
      // REGULAR carries no details block — its whole body is the card's `content`.
      return null;
  }
}

export function FeedPost({ post, onChanged, renderBookActions }: FeedPostProps) {
  const t = useT();
  const { data: profile } = useMyProfile();

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  const isAuthor = profile?.id === post.authorId;

  // Accept-answer is offered only to the author of a QNA post: `PostService.acceptAnswer`
  // throws for anyone else, and choosing an answer is one-way — there is no endpoint to
  // change or clear it, so `CommentThread` withdraws the control from the whole thread once
  // `acceptedAnswerId` is set.
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
      }}
      createdAt={post.createdAt}
      // While editing, the stored text is inside the editor's textarea; showing it above as
      // static copy too would put the same sentence on screen twice.
      content={editing ? undefined : post.content}
      location={location}
      hashtags={post.hashtags}
      // `commentCount` and `likeCount` are NOT passed on, and both components hide their
      // number when it is undefined precisely so a caller can make this call.
      //
      // The reason is that the two fields are dead in the payload: `FeedPostDataDto` declares
      // them, but `fanOutPost` never sets either, `updatePostCache` has no callers anywhere in
      // the backend, and no comment or reaction path touches the cached entry — so both are
      // the `int` default of 0 on every post, for ever. Measured, not assumed: posting a real
      // comment on this post left the cached entry at `"commentCount":0`.
      //
      // Rendering them would print "0 comments" directly above a comment the reader can see,
      // which is worse than printing nothing: a missing number reads as not-supplied, a wrong
      // one reads as broken. Restore both the moment the backend keeps them current.
      menu={
        isAuthor ? (
          <PostMenu
            postId={post.postId}
            onEdit={() => setEditing(true)}
            canEdit={!KINDS_WITH_UNECHOED_DETAILS.has(post.postType)}
            onDeleted={onChanged}
          />
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
            <PostBody post={post} onChanged={onChanged} renderBookActions={renderBookActions} />
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
            {/* No `count` — see the note on the card's `commentCount` above. */}
            <ReactionBar postId={post.postId} onChanged={onChanged} />
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
