'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
import {
  ArticleBody,
  BookBody,
  CodeSnippetBody,
  CommentPreview,
  CommentThread,
  EventBody,
  EventCalendarActions,
  EventRsvpBar,
  LinkBody,
  PollBody,
  PostCard,
  PostEditor,
  PostImages,
  PostMenu,
  QnaBody,
  QuizTaker,
  ReactionBar,
  ACTION_COUNT,
  ACTION_GLYPH,
  ACTION_GLYPH_BUTTON,
  ACTION_GROUP,
  type PostEditorState,
} from '@/features/posts';
import { BookActions } from '@/features/bookstore';
import { ReportPostDialog } from '@/features/moderation';
import { ExplainPostAction } from '@/features/knowledge';
import { useAuthGate, useMyProfile } from '@/features/security';
import { cn } from '@/shared/lib/cn';
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
  /**
   * Mount the comment thread already open. The feed leaves it closed — a column of posts
   * with every thread expanded is unreadable, and `CommentThread` fetches on mount, so it
   * would also be one request per post on screen.
   *
   * A PERMALINK IS THE OPPOSITE CASE. Every route into `/posts/{id}` is someone going to
   * read a specific discussion: a notification saying someone replied, a link a colleague
   * sent, a post cited as evidence for a verified skill. Landing on a collapsed thread makes
   * the reader press a button to see the thing they came for.
   * @default false
   */
  defaultCommentsOpen?: boolean;
  /**
   * Render the post at full length: no 280px clamp on the prose, no 320px clamp on a code
   * snippet, no "Xem thêm".
   *
   * TRUE ON `/posts/{id}` AND NOWHERE ELSE, because "Xem thêm" is a LINK to `/posts/{id}`. The
   * permalink renders this same component, so a long post arrived there clamped, under a control
   * that navigated to the page already on screen — nothing happened, and the reader had no way to
   * reach the rest of a post they had opened deliberately. See `PostCard`'s `expanded`.
   *
   * A SEPARATE PROP FROM `defaultCommentsOpen` even though the permalink is the only caller for
   * both: one says what the discussion does on arrival, the other says how much of the post is
   * shown. Folding them into one `permalink` boolean would mean any future surface that wants an
   * open thread also silently loses the clamp.
   * @default false
   */
  expanded?: boolean;
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
 * `images` and `taggedUserIds` USED to be the two that could not be preserved: the update DTO
 * accepted them while `FeedPostDataDto` did not echo them, so there was nothing to send back
 * and an edit nulled them. The backend echoes both now, with the exact types the update DTO
 * wants, so they are mapped like every other key below. Left in the file as a record because
 * the workaround outlived the gap and became the bug it was written to describe.
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
    // `qnaDetails` IS NOT HERE ANY MORE, and its absence is now the backend's rule rather than
    // this file's choice: the `src` audit (`93ca5e2`) dropped the block from
    // `UpdatePostRequestDto`. Nothing in it was ever author input — `isResolved` and
    // `acceptedAnswerId` are written by accepting an answer — so it used to ride through
    // untouched, and riding through was the risky half: `PostService.updatePost` runs
    // `BeanUtils.copyProperties`, which copies nulls, so any edit that failed to echo it exactly
    // would have unpicked the accepted answer. A field the request cannot carry cannot be
    // nulled by the request.
    pollDetails: post.pollDetails ?? undefined,
    linkDetails: post.linkDetails ?? undefined,
    quizDetails: post.quizDetails ?? undefined,
    // ECHOED BACK, NOT DROPPED. These two were hardcoded to `undefined` because the feed
    // payload genuinely did not carry them — and since `PostService.updatePost` runs
    // `BeanUtils.copyProperties`, which copies nulls, sending `undefined` DELETES them. The
    // backend has since added both to `FeedPostDataDto` with the exact types the update DTO
    // wants (`string[]` / `number[]`), so the workaround became the bug: editing the text of
    // a post with images silently destroyed the images.
    //
    // THIS NOTE HAS BEEN WRONG IN BOTH DIRECTIONS AND IS KEPT AS A LEDGER OF WHY. It first said
    // the seeded feed served posts with images; measuring on 24/08 (`GET /users/{id}/posts`, ids
    // 9000–9030) found 80 posts, 29 authors, and not one carrying `images`,
    // `articleDetails.coverImage` or `linkDetails.thumbnailUrl` — filed as S10. That is paid:
    // `V69` seeds the 1 / 2 / 5-image cases plus a deliberately broken URL.
    //
    // BUT V69 LIVES IN `db/seed-dev`, AND A RE-MEASURE ON THE SAME 31 IDS AFTER THE BACKEND
    // SHIPPED STILL ANSWERED ZERO — the contract is new (`POST /v1/api/media` is live) while this
    // instance's seed-dev data is not applied. So `PostImages` below renders nothing here yet,
    // and that is an environment fact rather than a missing feature.
    //
    // The mapping is right in every one of those states: it is the round-trip the update DTO
    // requires, and it is what stops an edit from destroying a post's pictures.
    // `?? undefined` for the same reason the other keys have it: the payload types these
    // nullable, and the request type does not take null. The two mean the same thing to the
    // server here — an absent key and an explicit null both end up null — so collapsing them
    // loses nothing.
    images: post.images ?? undefined,
    taggedUserIds: post.taggedUserIds ?? undefined,
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
function PostBody({
  post,
  onChanged,
  expanded,
}: {
  post: FeedPostData;
  onChanged: () => void;
  expanded: boolean;
}) {
  switch (post.postType) {
    case 'CODE_SNIPPET':
      return post.codeSnippetDetails ? (
        // No `href` means no cap — `CodeSnippetBody` already documents that a caller which cannot
        // name a destination gets the snippet whole. The permalink IS the destination, so it is
        // the same case: a "Xem thêm" here would point at the current URL and do nothing.
        <CodeSnippetBody
          details={post.codeSnippetDetails}
          href={expanded ? undefined : `/posts/${post.postId}`}
        />
      ) : null;
    case 'ARTICLE':
      // ARTICLE renders through the card's `header` slot, above the prose — `articleDetails`
      // is the piece's title and summary, and `content` is its body copy, so the order is
      // title → summary → content. See `FeedPost`'s `header` prop.
      return null;
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

export function FeedPost({
  post,
  onChanged,
  defaultCommentsOpen = false,
  expanded = false,
}: FeedPostProps) {
  const t = useT();
  const { data: profile } = useMyProfile();
  /**
   * THE CARD RENDERS IN FULL FOR A SIGNED-OUT READER — that is the point of the guest surface —
   * and only the controls whose FIRST effect is visible are gated here. Everything else is left
   * to `core/api/axios`, which refuses a guest's writes and raises the same prompt: a reaction
   * toggle, an RSVP, a poll vote and a quiz answer all reach it without this component knowing
   * they exist. What cannot be left to it is a control that opens something before it calls
   * anything, because the reader then sits in front of a panel that will never fill.
   */
  const { isGuest, guard } = useAuthGate();

  const [editing, setEditing] = useState(false);
  const [reporting, setReporting] = useState(false);

  /**
   * Where the comment button sends you ON THE PERMALINK, which is now the only place it goes
   * anywhere in-page at all — everywhere else it is a link to `/posts/{id}`. See `commentsHref`.
   *
   * IT IS A REF RATHER THAN AN ANCHOR because an `id` would have to be unique per post in a list
   * of twenty. The ref points at the wrapper holding whichever discussion shape rendered.
   *
   * SCROLLING IN THE HANDLER, NOT IN AN EFFECT. There is no state left for an effect to key on —
   * the thread this scrolls to is already mounted whenever this handler can be reached — and an
   * effect that fired once would leave a second press doing nothing.
   */
  const commentsRef = useRef<HTMLDivElement>(null);

  const scrollToComments = () => {
    commentsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  /**
   * THE COMMENT BUTTON IS A LINK TO THE POST'S OWN PAGE, at the owner's call, and this replaces
   * both of the things it used to do on a feed card: expanding an unbounded thread inside the
   * card, and scrolling to a two-comment preview. `/posts/{id}` opens with the whole discussion
   * already expanded and a composer under it — that is what `defaultCommentsOpen` is for — so the
   * shortest honest path to "I want to read or write comments" is to go there.
   *
   * WHAT IT DELETES, and this is the part worth checking before anyone restores it: the
   * `commentsOpen` flag and the `CommentThread` that mounted on demand under an EMPTY post. That
   * block existed because a post with no comments has nothing to preview, so the button was the
   * only route to its composer. The route is now the post's page, which has the same composer and
   * an address the reader can keep.
   *
   * NULL ON THE PERMALINK ITSELF, where a link would point at the page it is already on. There
   * the button keeps the scroll — the discussion is below, mounted, and worth moving to.
   * `defaultCommentsOpen` rather than `expanded` is the right flag for that question: it is the
   * one that says the thread is on this page.
   *
   * NO `guard` ON THE LINK SHAPE. The gate was here because opening a panel a guest cannot fill
   * is worse than refusing — see `useAuthGate` above — but navigating to a public permalink is not
   * a write, and the page decides for itself what a signed-out reader gets.
   *
   * THE SCROLL SHAPE IS GUARDED AGAIN, AND THE HOLE IT LEAVES OTHERWISE IS WORTH RECORDING. The
   * thread below is gated on `!isGuest`, so on the permalink a signed-out reader has nothing for
   * `commentsRef` to point at — and pressing `Bình luận` there scrolled to nothing at all: no
   * thread, no prompt, no navigation, no error. Measured 02/09 on a guest permalink, where the
   * reaction beside it correctly raised the sign-in prompt. A control that answers a press with
   * silence is worse than one that says no, and this is the page a guest reaches specifically to
   * read a discussion.
   */
  const commentsHref = defaultCommentsOpen ? null : `/posts/${post.postId}`;

  const isAuthor = profile?.id === post.authorId;

  // Accept-answer is offered only to the author of a QNA post: `PostService.acceptAnswer`
  // throws for anyone else. It is no longer one-way — `DELETE /qna/accept-answer` exists — so
  // this same flag now gates both directions, and `CommentThread` decides which of the two it
  // is offering from `acceptedAnswerId`.
  const canAcceptAnswer = isAuthor && post.postType === 'QNA';

  // 80 characters is roughly one full line of the 672 measure. Below that a post is a
  // status, not something with an argument in it to explain.
  //
  // EVENT/POLL/LINK/BOOK fail this a different way: `content` there is a caption beside
  // structured data (date/place, options, a URL, a book), not prose with a concept inside it —
  // long or short, there is nothing for the model to unpack. QUIZ already explains itself
  // per-question once graded (`QuizTaker`'s `result.explanations`), so a second, generic
  // "explain this post" button beside it would just be a redundant, paid control. REGULAR and
  // QNA stay on the length gate alone — both are free-form text that can genuinely run long.
  //
  // CODE_SNIPPET reads its own field instead (B46, closed on the backend 04/09):
  // `ExplanationService.buildPrompt` now folds `codeSnippetDetails.code` into the prompt for
  // this kind, so the substance worth explaining is the code, not the caption — and
  // `post-composer.tsx` explicitly lets this kind post with an empty `content` ("may stand
  // without prose"), so gating on `content` here left the typical snippet with no button at
  // all. The threshold is lower than prose's 80: a snippet worth posting is rarely under a
  // couple of lines, and unlike prose there is no filler padding it out.
  const explainableType =
    post.postType !== 'EVENT' &&
    post.postType !== 'POLL' &&
    post.postType !== 'LINK' &&
    post.postType !== 'BOOK' &&
    !post.quizDetails;
  const codeSnippetLength = post.codeSnippetDetails?.code?.trim().length ?? 0;
  const explainable =
    explainableType &&
    (post.postType === 'CODE_SNIPPET'
      ? codeSnippetLength >= 20
      : (post.content?.trim().length ?? 0) >= 80);

  // What `ExplainPostAction` shows as "explaining this" and saves as `originalContent` on
  // `/save`. Every other kind just hands over its own prose. CODE_SNIPPET hands over the code
  // instead, fenced with its language so it reads as code rather than a wall of text, with the
  // caption (if any) trailing after — same order the card itself renders them in. Passing
  // `post.content` here (the caption) would make the "original" on screen and in the saved
  // library disagree with what the button next to it is actually gated on.
  const explainContent =
    post.postType === 'CODE_SNIPPET' && post.codeSnippetDetails?.code
      ? [
          '```' + (post.codeSnippetDetails.language ?? ''),
          post.codeSnippetDetails.code,
          '```',
          post.content?.trim() || null,
        ]
          .filter((line): line is string => Boolean(line))
          .join('\n')
      : (post.content ?? '');

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
        // The handle, so the name and the avatar link to `/u/{username}`. It is the field
        // B13 asked for: without it the feed was the one surface in the app where a person's
        // name was printed and led nowhere.
        username: post.authorUsername,
        fullName: post.authorFullName,
        profilePictureUrl: post.authorProfilePictureUrl,
        eliteScore: post.authorEliteScore,
        // Both are embedded in the feed payload, so the card never calls the reputation
        // endpoint — and the level name is READ, never derived from the score (CLAUDE.md §1).
        levelName: post.authorLevelName,
      }}
      createdAt={post.createdAt}
      updatedAt={post.updatedAt}
      // Author-only — see `PostCard`'s `visibility` note. A stranger already knows they can see
      // this post (or it would 404), so telling them again adds nothing; the author is the one
      // who cannot otherwise recall which mode a given post is in once they scroll past it.
      visibility={isAuthor ? post.visibility : undefined}
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
      // Drops the prose clamp on the permalink; see the prop.
      expanded={expanded}
      // An ARTICLE's cover, title and summary lead the card, above the body copy in
      // `content`. Hidden while editing for the same reason the body is — the editor holds
      // these fields.
      header={
        !editing && post.postType === 'ARTICLE' && post.articleDetails ? (
          <ArticleBody details={post.articleDetails} />
        ) : undefined
      }
      // ATTACHED PICTURES CLOSE THE CARD, below the body and the location. `images` sits on
      // `FeedPostDataDto` beside `content`, not inside any details block, so any kind can carry
      // them — a gallery the reader browses after the post, not part of reading it. Hidden while
      // editing for the same reason the body is: the editor already holds these URLs.
      media={!editing ? <PostImages images={post.images} /> : undefined}
      menu={
        /**
         * THE MENU RENDERS FOR EVERY POST NOW, and its contents are what differ.
         *
         * It used to appear only on your own posts, because edit and delete were the only two
         * things it could offer. B11 added a user-facing report endpoint, so a stranger's post
         * has an action too — and the design system's note on this menu is that the owner's
         * version simply does not carry the report item, not that owners get a menu and other
         * people get nothing.
         */
        <PostMenu
          postId={post.postId}
          canEdit={isAuthor}
          canDelete={isAuthor}
          onEdit={() => setEditing(true)}
          onDeleted={onChanged}
          // Reporting opens a form with a reason to choose before anything is sent, so a guest
          // would fill it in and only then be asked to sign in. `guard` asks first.
          onReport={isAuthor ? undefined : guard(() => setReporting(true))}
        />
      }
      body={
        <>
          {editing ? (
            <PostEditor
              postId={post.postId}
              // `?? 'REGULAR'`: the payload types every field optional, and a post with no kind
              // is a plain post everywhere else in this file (`PostBody`'s switch falls through
              // to the same place). The editor uses it only to choose which panel to open.
              postType={post.postType ?? 'REGULAR'}
              current={toEditorState(post)}
              onDone={() => setEditing(false)}
              onSaved={onChanged}
            />
          ) : (
            <PostBody post={post} onChanged={onChanged} expanded={expanded} />
          )}

          {/* A quiz is an attachment, not a post type — `buildAndSavePost` accepts
              `quizDetails` regardless of `postType` — so it renders after whatever body the
              post has rather than as one of the cases above. */}
          {post.quizDetails && <QuizTaker postId={post.postId} quiz={post.quizDetails} />}

          <ReportPostDialog
            postId={post.postId}
            open={reporting}
            onClose={() => setReporting(false)}
          />

          {/**
           * THE AI EXPLANATION HAD NO ENTRY POINT ANYWHERE IN THE PRODUCT.
           *
           * `ExplainPostAction` was written, exported from `features/knowledge`'s barrel, and
           * rendered by nothing — so one of the app's four headline capabilities could not be
           * reached by a user at all. Same shape as the matchmaking gap: a finished data layer
           * with the last wire never run.
           *
           * IT LIVES UNDER THE BODY, NOT IN THE ACTION ROW. The action row is the P1 "what you
           * can do about this post" strip — react, comment, save — and every control in it is
           * one tap with an immediate result. Explaining is not that: it calls a model, takes
           * seconds, and then puts a block of prose on the screen. That output belongs where
           * the post's own content is, directly beneath what it explains.
           *
           * ONLY WHERE THERE IS SOMETHING TO EXPLAIN. `explainable` gates on real prose: a
           * one-line status has nothing for a model to unpack, and offering the button there
           * spends a paid call to be told so.
           */}
          {/* Hidden rather than gated for a guest: the backend has no anonymous route to the
              model, and unlike the controls above there is nothing here to preview — the button
              IS the request. */}
          {explainable && !isGuest && (
            <ExplainPostAction postId={post.postId} postContent={explainContent} />
          )}
        </>
      }
      actions={
        <>
          <ReactionBar
            postId={post.postId}
            count={post.likeCount}
            onChanged={onChanged}
            /**
             * PASSED IN RATHER THAN RENDERED BESIDE — see `ReactionBar`'s `actions` note. It used
             * to sit next to the bar in a row of this file's own, which capped the bar's width and
             * left the counts stranded mid-card instead of at its right edge.
             *
             * IT RENDERS ON EVERY POST NOW, AND IT USED TO RENDER ON ALMOST NONE. The note here
             * said it was "the guest's path and the empty-thread path only" — a signed-out reader
             * got it because `GET /posts/{id}/comments` is not an anonymous endpoint and a preview
             * would spin forever; an empty post got it because there was nothing to preview and
             * the composer still had to be reachable. Everyone else got nothing, which is how a
             * post with six comments ended up showing a lone reaction glyph and an empty stretch
             * of row beside it.
             *
             * BOTH OF THOSE CASES STILL HOLD; what changed is that they are no longer the only
             * ones. `openComments` does the right thing in all three shapes — it opens the thread
             * where one has to be mounted, and scrolls to the discussion where one is already on
             * the page — so there is no state left in which this button is dead.
             *
             * A GLYPH, NOT A WORD, and the same glyph button the reaction trigger wears: see
             * `ACTION_GLYPH_BUTTON`. The label survives as `sr-only`, so the accessible name is
             * still `Xem bình luận` and `title` gives a mouse the same string.
             */
            actions={
              // THE COUNT LIVES HERE, NOT IN `ReactionBar`. It used to be a `commentCount` prop on
              // that component, which printed both totals together at the row's right edge. Now
              // that each number stands beside the glyph it counts, the comment total belongs to
              // whoever builds the comment glyph — and that is this file, which already holds the
              // number and is the only place that knows what pressing it does.
              <div className={ACTION_GROUP}>
                {commentsHref ? (
                  <Link
                    href={commentsHref}
                    title={t('post.comments.show')}
                    className={cn(
                      ACTION_GLYPH_BUTTON,
                      'text-nx-text-secondary hover:text-nx-text-primary'
                    )}
                  >
                    <MessageCircle aria-hidden className={ACTION_GLYPH} />
                    <span className="sr-only">{t('post.comments.show')}</span>
                  </Link>
                ) : (
                  <button
                    type="button"
                    // The handler is composed inside the event rather than built during render:
                    // `scrollToComments` reads `commentsRef.current`, and passing the function
                    // itself to `onClick` is fine, but wrapping it at render time in anything
                    // that could read the ref trips `react-hooks/refs` — which is why `guard`
                    // wraps it here, at click time, rather than once above.
                    onClick={() => guard(scrollToComments)()}
                    title={t('post.comments.show')}
                    className={cn(
                      ACTION_GLYPH_BUTTON,
                      'text-nx-text-secondary hover:text-nx-text-primary'
                    )}
                  >
                    <MessageCircle aria-hidden className={ACTION_GLYPH} />
                    <span className="sr-only">{t('post.comments.show')}</span>
                  </button>
                )}

                {/* A SECOND CONTROL RATHER THAN TEXT INSIDE THE FIRST, to match the reaction pair
                    beside it — where the glyph and the number genuinely do different things
                    (toggle vs. show who reacted) and cannot be one button. Here they lead to the
                    same place, so the number is simply a second way in; making it a plain span
                    would have been a number you can see next to a button you can press, which is
                    the one arrangement that invites a click that does nothing.

                    Hidden at zero, like every other count in this product. */}
                {!!post.commentCount &&
                  (commentsHref ? (
                    <Link
                      href={commentsHref}
                      aria-label={t('post.commentCount', { count: post.commentCount })}
                      className={cn(
                        ACTION_COUNT,
                        'hover:text-nx-text-primary',
                        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring'
                      )}
                    >
                      {post.commentCount}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => guard(scrollToComments)()}
                      aria-label={t('post.commentCount', { count: post.commentCount })}
                      className={cn(
                        ACTION_COUNT,
                        'hover:text-nx-text-primary',
                        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring'
                      )}
                    >
                      {post.commentCount}
                    </button>
                  ))}
              </div>
            }
          />

          {/**
           * TWO SHAPES, AND WHICH ONE YOU GET IS THE SAME `defaultCommentsOpen` SPLIT THIS FILE
           * ALREADY HAD — the preview did not replace the thread, it replaced the FEED's copy of
           * it.
           *
           * THE PERMALINK STILL OPENS ITS DISCUSSION IN FULL. `/posts/{id}` exists because someone
           * followed a link to one specific conversation; showing them two comments and a button
           * to see the rest would be asking them to arrive twice. `e2e/newsfeed.spec.ts` asserts
           * this out loud, and swapping in the preview broke it — which is how the regression was
           * caught rather than shipped.
           *
           * THE FEED GETS THE PREVIEW: two comments and a way in, instead of a button that grew
           * the card by an unbounded thread. See `CommentPreview`, and note there that the
           * "most-liked" ordering has no backing data on the comment DTO.
           *
           * IT IS TWO SHAPES AND NOT THREE ANY MORE. A third used to mount here — a full thread
           * that appeared under an EMPTY post once the comment button was pressed, because such a
           * post has nothing to preview and the composer had to be reachable somehow. The button
           * is a link to `/posts/{id}` now (see `commentsHref`), and that page mounts the same
           * thread with the same composer, so the on-demand copy had nothing left to do.
           */}
          {/* ONE WRAPPER, so `commentsRef` has a single thing to point at whichever shape
              rendered. It repeats the action strip's own `gap` rather than adding a rung.

              GATED ON `!isGuest` SO IT IS NOT AN EMPTY FLEX CHILD. Both shapes are already
              signed-in-only, and an empty div in a `gap` column still pays the gap: a guest would
              get 8px of dead space under the acting row. */}
          {!isGuest && (
            <div ref={commentsRef} className="flex flex-col gap-[var(--nx-space-tight)]">
              {defaultCommentsOpen ? (
                <CommentThread
                  postId={post.postId}
                  onChanged={onChanged}
                  canAcceptAnswer={canAcceptAnswer}
                  acceptedAnswerId={post.qnaDetails?.acceptedAnswerId}
                />
              ) : (
                <CommentPreview postId={post.postId} commentCount={post.commentCount} />
              )}
            </div>
          )}
        </>
      }
    />
  );
}
