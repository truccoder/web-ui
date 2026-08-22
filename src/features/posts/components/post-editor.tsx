'use client';

import { useState } from 'react';
import { Button, Select, Textarea } from '@/shared/components';
import { useT } from '@/core/i18n';
import { getErrorMessage } from '@/shared/lib/api-error';
import { cn } from '@/shared/lib/cn';
import { useUpdatePost } from '../hooks/use-post';
import type {
  ArticleDetails,
  CodeSnippetDetails,
  LinkDetails,
  PollDetails,
  PostType,
  PostVisibility,
  QuizDetails,
  UpdatePostRequest,
} from '../types/post';
import { ArticleFields } from './article-fields';
import { CodeSnippetFields } from './code-snippet-fields';
import { LinkFields, isValidLinkUrl } from './link-fields';
import { PollFields, POLL_MIN_OPTIONS } from './poll-fields';
import { QuizComposer, isQuizReady, normalizeQuiz } from './quiz-composer';

/**
 * Edit an existing post.
 *
 * THIS IS A WHOLE-OBJECT WRITE PRETENDING TO BE A FIELD EDIT, and it has to be.
 * `PostService.updatePost` runs `BeanUtils.copyProperties(request, post)`, which copies
 * **nulls too** — so any field absent from the request is wiped from the stored post. Send
 * only `content` and the post loses its location, its details block, its tags, everything.
 *
 * The design that follows from that: the caller hands in `current`, the post's full present
 * state, and this component sends all of it back with only the edited fields changed. There
 * is no PATCH here and there must not be one.
 *
 * THE TWO FIELDS THAT COULD NOT BE PRESERVED NOW CAN. This note used to say `images` and
 * `taggedUserIds` were absent from `FeedPostDataDto`, so an edit nulled them and the fix had
 * to come from the backend. The backend did it: both are on the feed payload now, typed
 * exactly as the update DTO wants them. `toEditorState` echoes them back, and this paragraph
 * is kept rather than deleted because the failure it describes is the one to watch for — any
 * key this component does not send is a key the server sets to null.
 *
 * ────────────────────────────────────────────────────────────────────────────────────────────
 * THE PER-KIND PANELS ARE HERE NOW, and until they were, this form edited exactly two things:
 * prose and visibility. An `ARTICLE`'s title, a snippet's language, a poll's options, a link's
 * URL were all carried through `...current` untouched and unreachable — the author could see
 * the wrong title on their own post and had no way to fix it short of deleting the post and
 * writing it again. `docs/demo-script.md` carried a line telling the presenter not to
 * demonstrate editing, for exactly this reason.
 *
 * THE PANELS ARE THE COMPOSER'S OWN COMPONENTS, not copies. `ArticleFields`, `CodeSnippetFields`,
 * `PollFields`, `LinkFields` and `QuizComposer` are `value`/`onChange` pairs over a details
 * block — they were never composer-specific, they were only ever *used* there first. Reusing
 * them is what keeps the two forms from drifting into two different ideas of what an article is.
 *
 * WHICH KINDS ARE MISSING, AND WHY THAT IS THE CONTRACT RATHER THAN AN OMISSION.
 * `UpdatePostRequestDto` carries `articleDetails`, `codeSnippetDetails`, `linkDetails`,
 * `pollDetails`, `qnaDetails` and `quizDetails` — and **no** `eventDetails`, `bookDetails` or
 * `postType`. An event's time and a book's price are immutable by the shape of the request, so
 * those two kinds get a sentence saying so instead of a panel that could not save. `QNA` has a
 * block on the DTO but nothing in it is author input: `isResolved` and `acceptedAnswerId` are
 * written by accepting an answer, so it rides through on `...current`, and the question itself
 * is the post's own prose, which the textarea already edits.
 *
 * EDITING A POLL DOES NOT DESTROY VOTES, because there are none to destroy: the backend has no
 * vote endpoint at all (recorded in `poll-fields.tsx`), so `votesCount` is whatever create or
 * update last wrote and no reader holds an option id. When a vote endpoint arrives, renumbering
 * ids on remove — which `PollFields` does — becomes destructive and this decision has to be
 * revisited.
 *
 * ────────────────────────────────────────────────────────────────────────────────────────────
 * THE QUIZ ANSWER KEY CANNOT SURVIVE AN EDIT, AND NO FRONTEND CHANGE CAN MAKE IT.
 *
 * Found while wiring the panels, and it was live before them: `FeedPostDataDto.quizDetails` is
 * a `PublicQuizDetailsDto` — `{ title, questions: [{ question, options }] }` — while the update
 * DTO wants `QuizDetails`, whose questions also carry `correctOptionIndex` and `explanation`.
 * Every field in a generated DTO is optional, so the public shape assigns to the author shape
 * without complaint, and `...current` sent it straight back. `BeanUtils.copyProperties` then
 * wrote null over every `correctOptionIndex` in the post. The quiz stayed on screen and kept its
 * questions, and started grading every submission against a null key.
 *
 * No endpoint returns the authored quiz: `GET /v1/api/posts/{postId}` serves the same
 * `FeedPostDataDto` the feed does. So the key is genuinely not available to this client, and the
 * choice is between three losses rather than between loss and no loss:
 *
 *   - send it back as received → silent, and the post looks fine while grading is broken;
 *   - omit `quizDetails` → the whole quiz is deleted, questions included;
 *   - hand the author the questions we do have and ask for the key → nothing is lost silently.
 *
 * The third is what this does. `QuizComposer` opens seeded with the real questions and options
 * and no answer marked, `isQuizReady` refuses the save until the author marks them, and the
 * warning says why. It is friction on an edit that used to be free, and the friction is the
 * accurate report: saving genuinely does rewrite the key. The backend fix — echo the authored
 * quiz to the post's own author, or stop copying nulls — belongs in `docs/backend-plan.md`.
 */
/**
 * Every key of the update payload, required — values may still be `undefined`, but the
 * caller has to write them out.
 *
 * This exists because omitting a key here DESTROYS DATA, and `UpdatePostRequest` has all
 * fields optional (the generated spec marks everything optional), so a caller that forgot
 * `quizDetails` would compile happily and silently drop the quiz. Measured, not theorised:
 * saving an edit with a partial `current` wiped `quiz_details` to null and reset
 * `qnaDetails.acceptedAnswerId` on a real post. Mapping the feed payload is a decision per
 * field, so the type makes the caller take it.
 */
export type PostEditorState = {
  // `keyof Required<…>` makes every key mandatory while `UpdatePostRequest[K]` keeps the
  // original value type, which still includes `undefined`. Writing `-?` instead would also
  // strip `undefined` from the values and force fake data for blocks the post does not have.
  [K in keyof Required<UpdatePostRequest>]: UpdatePostRequest[K];
};

export interface PostEditorProps {
  postId: number;
  /**
   * Which panel to open. Not on `UpdatePostRequestDto` — the kind is fixed at creation — so it
   * is passed separately rather than read off `current`, which holds only what gets sent.
   */
  postType: PostType;
  /**
   * The post's complete current state, as held by the feed/search payload. Everything here
   * is sent back on save; see the note above on why partial updates are impossible.
   */
  current: PostEditorState;
  onDone: () => void;
  /** Lets the composing screen refresh the payload this edited post came from. */
  onSaved?: () => void;
  className?: string;
}

const VISIBILITIES: PostVisibility[] = ['PUBLIC', 'FRIENDS', 'PRIVATE'];

/** Kinds this form renders a details panel for — the ones the update DTO can actually carry. */
const EDITABLE_DETAIL_TYPES: PostType[] = ['CODE_SNIPPET', 'ARTICLE', 'POLL', 'LINK'];

/** Kinds whose details block the update DTO does not carry at all — see the file note. */
const IMMUTABLE_DETAIL_TYPES: PostType[] = ['EVENT', 'BOOK'];

/**
 * A poll that arrives with fewer than two options — possible for anything created before the
 * composer's guard, or by a direct API call — still has to be editable, so the panel is padded
 * up to the minimum rather than rendering a list the author cannot complete.
 */
function seedPoll(details: PollDetails | undefined): PollDetails {
  const options = [...(details?.options ?? [])];
  while (options.length < POLL_MIN_OPTIONS) {
    options.push({ id: options.length + 1, text: '', votesCount: 0 });
  }
  return { allowMultipleVotes: false, ...details, options };
}

export function PostEditor({
  postId,
  postType,
  current,
  onDone,
  onSaved,
  className,
}: PostEditorProps) {
  const t = useT();
  const update = useUpdatePost({
    onSuccess: () => {
      onSaved?.();
      onDone();
    },
  });

  const [content, setContent] = useState(current.content ?? '');
  const [visibility, setVisibility] = useState<PostVisibility>(current.visibility ?? 'PUBLIC');

  // One state per editable kind, seeded from what the post already holds. Only the block that
  // matches `postType` is ever sent — same rule as the composer, and for the same reason:
  // `BeanUtils.copyProperties` stores whatever details block it is handed, matching kind or not.
  const [code, setCode] = useState<CodeSnippetDetails>(
    current.codeSnippetDetails ?? { language: 'plaintext', code: '' }
  );
  const [article, setArticle] = useState<ArticleDetails>(current.articleDetails ?? {});
  const [poll, setPoll] = useState<PollDetails>(() => seedPoll(current.pollDetails));
  const [link, setLink] = useState<LinkDetails>(current.linkDetails ?? {});

  /**
   * The quiz, if the post has one — seeded from the public shape, so the questions and options
   * are real and `correctOptionIndex` is missing from every one of them. See the file note.
   */
  const [quiz, setQuiz] = useState<QuizDetails | undefined>(current.quizDetails);

  const trimmed = content.trim();

  /**
   * The same gates the composer applies, minus the kinds this form cannot edit. Duplicated
   * rather than shared: the composer's version also decides `BOOK` and `EVENT` from file and
   * timestamp state that does not exist here, and a shared function with two dead branches
   * reads worse than the ten lines that say what this form actually requires.
   *
   * These are frontend manners, not server rules — `updatePost` would accept an empty article.
   */
  const detailsReady = (() => {
    switch (postType) {
      case 'CODE_SNIPPET':
        return (code.code ?? '').trim().length > 0;
      case 'ARTICLE':
        return (article.title ?? '').trim().length > 0 && trimmed.length > 0;
      case 'POLL':
        return (
          (poll.question ?? '').trim().length > 0 &&
          (poll.options ?? []).filter((option) => (option.text ?? '').trim().length > 0).length >=
            POLL_MIN_OPTIONS
        );
      case 'LINK':
        return isValidLinkUrl(link.url);
      // A plain post and a question are their prose; `EVENT` and `BOOK` keep whatever they had.
      case 'REGULAR':
      case 'QNA':
        return trimmed.length > 0;
      default:
        return true;
    }
  })();

  // An attached quiz gates every kind, because `validateQuizDetails` runs for every kind — and
  // here it does double duty as the thing that stops a save from writing a null answer key.
  const canSave = detailsReady && (quiz === undefined || isQuizReady(quiz)) && !update.isPending;

  /** Exactly one details key, chosen by `postType` — see the note on `BeanUtils` above. */
  const editedDetails = (): Partial<UpdatePostRequest> => {
    switch (postType) {
      case 'CODE_SNIPPET':
        return { codeSnippetDetails: code };
      case 'ARTICLE':
        return { articleDetails: article };
      case 'POLL':
        return {
          pollDetails: {
            ...poll,
            // Blank options are dropped and ids re-pointed over what survives, exactly as the
            // composer does. Safe only while no vote endpoint exists — see the file note.
            options: (poll.options ?? [])
              .filter((option) => (option.text ?? '').trim().length > 0)
              .map((option, index) => ({ ...option, id: index + 1, text: option.text?.trim() })),
          },
        };
      case 'LINK':
        return { linkDetails: link };
      default:
        return {};
    }
  };

  const save = () => {
    if (!canSave) return;
    update.mutate({
      postId,
      // Spread first, override second: every block the caller gave us goes back untouched, and
      // only what this form edited is replaced. `quizDetails` is overridden whenever the post
      // has one, because the value in `current` is the public shape — the one key that must
      // never ride through on the spread.
      payload: {
        ...current,
        content: trimmed,
        visibility,
        ...editedDetails(),
        ...(quiz && { quizDetails: normalizeQuiz(quiz) }),
      },
    });
  };

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <Textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        rows={4}
        autoFocus
        label={t('post.edit.content')}
      />

      {/* Same surface as the composer's panel — a sunken block inside the card — so the two
          forms read as the same operation on the same object. */}
      {EDITABLE_DETAIL_TYPES.includes(postType) && (
        <div className="flex flex-col gap-3 rounded-nx-sm border border-nx-border-default bg-nx-surface-sunken p-3">
          {postType === 'CODE_SNIPPET' && <CodeSnippetFields value={code} onChange={setCode} />}
          {postType === 'ARTICLE' && <ArticleFields value={article} onChange={setArticle} />}
          {postType === 'POLL' && <PollFields value={poll} onChange={setPoll} />}
          {postType === 'LINK' && <LinkFields value={link} onChange={setLink} />}
        </div>
      )}

      {/* Says the limit rather than hiding it. An author who opens the edit form on their event
          and finds only a textarea will go looking for the date field; this is the answer to
          that search, and it is the truth — `UpdatePostRequestDto` has no `eventDetails`. */}
      {IMMUTABLE_DETAIL_TYPES.includes(postType) && (
        <p className="text-nx-micro text-nx-text-secondary">
          {t(`post.edit.immutable.${postType}`)}
        </p>
      )}

      {quiz && (
        <div className="flex flex-col gap-3 rounded-nx-sm border border-nx-border-default bg-nx-surface-sunken p-3">
          {/* `role="alert"` and above the composer, because it explains a consequence of saving
              rather than a property of the field under it. */}
          <p
            role="alert"
            className="rounded-nx-sm bg-nx-status-warning-bg px-3 py-2 text-nx-body-sm text-nx-status-warning-fg"
          >
            {t('post.edit.quizKeyLost')}
          </p>
          <QuizComposer value={quiz} onChange={setQuiz} />
        </div>
      )}

      {update.error && (
        <p role="alert" className="text-nx-micro text-nx-status-danger-fg">
          {getErrorMessage(update.error)}
        </p>
      )}

      <Select
        label={t('createPost.visibilityLabel')}
        value={visibility}
        onChange={(event) => setVisibility(event.target.value as PostVisibility)}
        options={VISIBILITIES.map((value) => ({
          // Interpolated key here matches `PostComposer`, which already reads the same three
          // labels this way — one style per concept beats a locally purer one.
          value,
          label: t(`createPost.visibility.${value}`),
        }))}
      />

      {/* An edit re-enters moderation: `updatePost` sets the post back to PENDING_MODERATION,
          pulls it out of every feed it had been fanned out to, and republishes it only once
          the async review passes. Measured at P2.4'd — the edited post left the feed and came
          back roughly a minute later. Without this line the author watches their post vanish
          the moment they save it and reasonably concludes the edit destroyed it. Same reason
          the composer carries its own notice. */}
      <p className="text-nx-micro text-nx-text-secondary">{t('post.edit.pendingReview')}</p>

      <div className="flex items-center gap-2">
        <Button size="sm" onClick={save} loading={update.isPending} disabled={!canSave}>
          {t('post.edit.save')}
        </Button>
        <Button size="sm" variant="ghost" onClick={onDone} disabled={update.isPending}>
          {t('post.comments.cancel')}
        </Button>
      </div>
    </div>
  );
}
