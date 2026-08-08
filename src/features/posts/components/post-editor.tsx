'use client';

import { useState } from 'react';
import { Button, Select, Textarea } from '@/shared/components';
import { useT } from '@/core/i18n';
import { getErrorMessage } from '@/shared/lib/api-error';
import { cn } from '@/shared/lib/cn';
import { useUpdatePost } from '../hooks/use-post';
import type { PostVisibility, UpdatePostRequest } from '../types/post';

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
 * TWO FIELDS CANNOT BE PRESERVED, and the frontend cannot fix it: `images` and
 * `taggedUserIds` exist on `UpdatePostRequestDto` but are **absent from the feed payload**
 * (`FeedPostDataDto` never echoes them), so there is nothing to send back and an edit nulls
 * them. Today that is harmless in practice — `PostComposer` never sets either field, so
 * posts written by this app have them empty already — but a post created by any other
 * client would silently lose them. The real fix is the backend echoing both fields.
 *
 * `postType`, `eventDetails` and `bookDetails` are not on the update DTO at all, so they are
 * immutable by contract rather than by omission — no special handling needed.
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

export function PostEditor({ postId, current, onDone, onSaved, className }: PostEditorProps) {
  const t = useT();
  const update = useUpdatePost({
    onSuccess: () => {
      onSaved?.();
      onDone();
    },
  });

  const [content, setContent] = useState(current.content ?? '');
  const [visibility, setVisibility] = useState<PostVisibility>(current.visibility ?? 'PUBLIC');

  const save = () => {
    update.mutate({
      postId,
      // Spread first, override second: every block the caller gave us goes back untouched,
      // and only the two fields this form actually edits are replaced.
      payload: { ...current, content: content.trim(), visibility },
    });
  };

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        rows={4}
        autoFocus
        label={t('post.edit.content')}
      />

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

      {update.error && (
        <p className="text-nx-micro text-nx-status-danger-fg">{getErrorMessage(update.error)}</p>
      )}

      {/* An edit re-enters moderation: `updatePost` sets the post back to PENDING_MODERATION,
          pulls it out of every feed it had been fanned out to, and republishes it only once
          the async review passes. Measured at P2.4'd — the edited post left the feed and came
          back roughly a minute later. Without this line the author watches their post vanish
          the moment they save it and reasonably concludes the edit destroyed it. Same reason
          the composer carries its own notice. */}
      <p className="text-nx-micro text-nx-text-secondary">{t('post.edit.pendingReview')}</p>

      <div className="flex items-center gap-2">
        <Button size="sm" onClick={save} loading={update.isPending}>
          {t('post.edit.save')}
        </Button>
        <Button size="sm" variant="ghost" onClick={onDone} disabled={update.isPending}>
          {t('post.comments.cancel')}
        </Button>
      </div>
    </div>
  );
}
