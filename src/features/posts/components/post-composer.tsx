'use client';

import { useState } from 'react';
import { Avatar, Button, Card, Select, Textarea } from '@/shared/components';
import { getErrorMessage } from '@/shared/lib/api-error';
import { useMyProfile } from '@/features/security';
import { useT } from '@/lib/i18n';
import { useCreatePost } from '../hooks/use-post';
import type { PostVisibility } from '../types/post';

/**
 * The post composer — cycle 1, `REGULAR` posts (`POST /v1/api/posts`).
 *
 * `onPosted` exists because the read side of a post lives in **another** domain: the feed.
 * Rather than invalidate `newsfeed`'s query keys from inside `posts` (which would hardcode
 * another feature's cache and fail the extraction test, CLAUDE.md §4), the composing page
 * passes a callback and refreshes its own feed. Same reasoning as the hooks layer.
 *
 * The success line is deliberately hedged: `PostService` saves new posts as
 * `PENDING_MODERATION` whenever moderation is enabled, so a freshly posted item may not
 * appear in the feed at all. Claiming "posted!" and showing nothing is how a working app
 * looks broken.
 */
export interface PostComposerProps {
  /** Called after a successful create, for the host page to refresh its feed. */
  onPosted?: () => void;
}

const VISIBILITIES: PostVisibility[] = ['PUBLIC', 'FRIENDS', 'PRIVATE'];

export function PostComposer({ onPosted }: PostComposerProps) {
  const t = useT();
  const { data: profile } = useMyProfile();
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState<PostVisibility>('PUBLIC');
  const [justPosted, setJustPosted] = useState(false);

  const create = useCreatePost({
    onSuccess: () => {
      setContent('');
      setJustPosted(true);
      onPosted?.();
    },
  });

  const trimmed = content.trim();
  const canSubmit = trimmed.length > 0 && !create.isPending;
  const firstName = profile?.fullName?.trim().split(/\s+/).pop() ?? '';

  const submit = () => {
    if (!canSubmit) return;
    setJustPosted(false);
    create.mutate({ content: trimmed, visibility, postType: 'REGULAR' });
  };

  return (
    <Card padding={16} className="w-full">
      <div className="flex gap-3">
        <Avatar src={profile?.profilePictureUrl} name={profile?.fullName} size="lg" />

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <Textarea
            autoResize
            rows={2}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder={t('createPost.placeholder', { fullname: firstName })}
            aria-label={t('createPost.post')}
          />

          {create.isError && (
            <p
              role="alert"
              className="rounded-nx-sm bg-nx-status-danger-bg px-3 py-2 text-nx-body-sm text-nx-status-danger-fg"
            >
              {getErrorMessage(create.error)}
            </p>
          )}

          {justPosted && !create.isPending && (
            <p className="rounded-nx-sm bg-nx-status-info-bg px-3 py-2 text-nx-body-sm text-nx-status-info-fg">
              {t('createPost.submittedPendingReview')}
            </p>
          )}

          <div className="flex items-center justify-between gap-3">
            <Select
              size="sm"
              className="w-auto"
              value={visibility}
              onChange={(event) => setVisibility(event.target.value as PostVisibility)}
              aria-label={t('createPost.visibilityLabel')}
              options={VISIBILITIES.map((value) => ({
                value,
                label: t(`createPost.visibility.${value}`),
              }))}
            />

            <Button onClick={submit} disabled={!canSubmit} loading={create.isPending}>
              {create.isPending ? t('createPost.posting') : t('createPost.post')}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
