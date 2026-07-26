'use client';

import { useState, type ReactNode } from 'react';
import { BarChart3, Code2, FileText, HelpCircle, Link2, X } from 'lucide-react';
import { Avatar, Button, Card, Select, Textarea } from '@/shared/components';
import { getErrorMessage } from '@/shared/lib/api-error';
import { useMyProfile } from '@/features/security';
import { useT } from '@/lib/i18n';
import { useCreatePost } from '../hooks/use-post';
import type { LocationResolution } from '../types/location';
import type {
  ArticleDetails,
  CodeSnippetDetails,
  CreatePostRequest,
  LinkDetails,
  PollDetails,
  PostType,
  PostVisibility,
} from '../types/post';
import { ArticleFields } from './article-fields';
import { CodeSnippetFields } from './code-snippet-fields';
import { LinkFields, isValidLinkUrl } from './link-fields';
import { LocationPicker } from './location-picker';
import { PollFields, POLL_MIN_OPTIONS } from './poll-fields';
import { QnaFields } from './qna-fields';

/**
 * The post composer — `POST /v1/api/posts`. Cycle 1 covers six of the eight kinds:
 * `REGULAR` (P2.4c-1) plus `CODE_SNIPPET`, `ARTICLE`, `QNA`, `POLL` and `LINK` (P2.4c-3).
 *
 * `EVENT` AND `BOOK` ARE ABSENT ON PURPOSE, not forgotten. `BOOK` is rejected outright by
 * `createPost` ("Use POST /v1/api/posts/books") and arrives with its multipart fields in c-4;
 * `EVENT` belongs to cycle 3 (`EventController`). Offering either now would be a switcher entry
 * that cannot produce a post.
 *
 * ONE STATE PER KIND, ONLY THE ACTIVE ONE SENT. `PostService.buildAndSavePost` copies the
 * request onto the entity with `BeanUtils.copyProperties`, which does not care whether a details
 * block matches `postType` — send `pollDetails` on an `ARTICLE` and it is stored anyway. So the
 * payload is assembled from exactly one key. Keeping the drafts separate rather than clearing
 * them on switch means flipping kinds to compare does not destroy what was typed.
 *
 * SUBMIT GATES ARE FRONTEND-ONLY. The backend validates just `EVENT` and an attached quiz;
 * `CODE_SNIPPET`, `ARTICLE`, `QNA`, `POLL` and `LINK` would all be accepted empty. The
 * per-kind checks in `isReady` exist to stop junk posts, and must not be described to anyone as
 * server rules.
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

/** Kinds this composer can actually produce, in switcher order. `REGULAR` is the default state. */
const SWITCHABLE_TYPES = ['CODE_SNIPPET', 'ARTICLE', 'QNA', 'POLL', 'LINK'] as const;
type SwitchableType = (typeof SWITCHABLE_TYPES)[number];

const TYPE_ICONS: Record<SwitchableType, ReactNode> = {
  CODE_SNIPPET: <Code2 />,
  ARTICLE: <FileText />,
  QNA: <HelpCircle />,
  POLL: <BarChart3 />,
  LINK: <Link2 />,
};

const EMPTY_POLL: PollDetails = {
  allowMultipleVotes: false,
  options: Array.from({ length: POLL_MIN_OPTIONS }, (_, i) => ({
    id: i + 1,
    text: '',
    votesCount: 0,
  })),
};

export function PostComposer({ onPosted }: PostComposerProps) {
  const t = useT();
  const { data: profile } = useMyProfile();
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState<PostVisibility>('PUBLIC');
  const [location, setLocation] = useState<LocationResolution | undefined>();
  const [postType, setPostType] = useState<PostType>('REGULAR');
  const [justPosted, setJustPosted] = useState(false);

  const [code, setCode] = useState<CodeSnippetDetails>({ language: 'plaintext', code: '' });
  const [article, setArticle] = useState<ArticleDetails>({});
  const [poll, setPoll] = useState<PollDetails>(EMPTY_POLL);
  const [link, setLink] = useState<LinkDetails>({});

  const create = useCreatePost({
    onSuccess: () => {
      setContent('');
      setLocation(undefined);
      setPostType('REGULAR');
      setCode({ language: 'plaintext', code: '' });
      setArticle({});
      setPoll(EMPTY_POLL);
      setLink({});
      setJustPosted(true);
      onPosted?.();
    },
  });

  const trimmed = content.trim();
  const firstName = profile?.fullName?.trim().split(/\s+/).pop() ?? '';

  // What each kind needs before submitting is worth anything. `content` is the article body and
  // the Q&A question, so those two still require it; a snippet, poll or link carries its own
  // substance in its details block and may stand without prose.
  const isReady = (() => {
    switch (postType) {
      case 'CODE_SNIPPET':
        return (code.code ?? '').trim().length > 0;
      case 'ARTICLE':
        return (article.title ?? '').trim().length > 0 && trimmed.length > 0;
      case 'QNA':
        return trimmed.length > 0;
      case 'POLL':
        return (
          (poll.question ?? '').trim().length > 0 &&
          (poll.options ?? []).filter((option) => (option.text ?? '').trim().length > 0).length >=
            POLL_MIN_OPTIONS
        );
      case 'LINK':
        return isValidLinkUrl(link.url);
      default:
        return trimmed.length > 0;
    }
  })();

  const canSubmit = isReady && !create.isPending;

  /** Exactly one details key, chosen by `postType` — see the note on `BeanUtils` above. */
  const detailsFor = (type: PostType): Partial<CreatePostRequest> => {
    switch (type) {
      case 'CODE_SNIPPET':
        return { codeSnippetDetails: code };
      case 'ARTICLE':
        return { articleDetails: article };
      // Not author input: an empty object is what keeps `acceptAnswer` reachable later, since it
      // rejects any QNA post whose `qnaDetails` is null. See `qna-fields.tsx`.
      case 'QNA':
        return { qnaDetails: { isResolved: false } };
      case 'POLL':
        return {
          pollDetails: {
            ...poll,
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

  const submit = () => {
    if (!canSubmit) return;
    setJustPosted(false);
    create.mutate({
      content: trimmed,
      visibility,
      postType,
      // Spread the resolved candidate's own fields: the response mirrors the create request's
      // location shape on purpose. The legacy composer instead sent a flattened `location`
      // object, a key `CreatePostRequestDto` does not have — so every location it collected
      // was silently discarded by the backend.
      ...(location && {
        googlePlaceId: location.googlePlaceId,
        locationType: location.locationType,
        locationDetails: location.locationDetails,
      }),
      ...detailsFor(postType),
    });
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
            placeholder={t(`createPost.contentPlaceholder.${postType}`, { fullname: firstName })}
            aria-label={t('createPost.post')}
          />

          {postType !== 'REGULAR' && (
            <div className="flex flex-col gap-3 rounded-nx-sm border border-nx-border-default bg-nx-surface-sunken p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-nx-body-sm font-semibold text-nx-text-primary">
                  {t(`createPost.type.${postType}`)}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<X />}
                  onClick={() => setPostType('REGULAR')}
                  aria-label={t('createPost.removeType')}
                >
                  {t('createPost.removeType')}
                </Button>
              </div>

              {postType === 'CODE_SNIPPET' && <CodeSnippetFields value={code} onChange={setCode} />}
              {postType === 'ARTICLE' && <ArticleFields value={article} onChange={setArticle} />}
              {postType === 'QNA' && <QnaFields />}
              {postType === 'POLL' && <PollFields value={poll} onChange={setPoll} />}
              {postType === 'LINK' && <LinkFields value={link} onChange={setLink} />}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <LocationPicker value={location} onChange={setLocation} />

            {SWITCHABLE_TYPES.filter((type) => type !== postType).map((type) => (
              <Button
                key={type}
                size="sm"
                variant="ghost"
                icon={TYPE_ICONS[type]}
                onClick={() => setPostType(type)}
              >
                {t(`createPost.type.${type}`)}
              </Button>
            ))}
          </div>

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
