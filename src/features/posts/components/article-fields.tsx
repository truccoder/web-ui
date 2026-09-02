'use client';

import { Link2 } from 'lucide-react';
import { Input, Textarea } from '@/shared/components';
import { useT } from '@/core/i18n';
import type { ArticleDetails } from '../types/post';

/**
 * `ARTICLE` payload — `articleDetails: { title, coverImage, summary }`. The article *body* is
 * the post's `content`; `summary` is the teaser the feed card shows.
 *
 * `coverImage` IS A URL FIELD, NOT AN UPLOAD, because the backend has no general-purpose file
 * endpoint. Grepping `@RequestPart MultipartFile` across every controller returns exactly
 * three: the book file and its cover (`POST /posts/books`), the registration avatar, and
 * `PUT /profile/picture`. There is no image endpoint a composer could post to, so the only
 * honest control is "paste a link to an image". When the backend grows an upload endpoint,
 * this field becomes a file picker.
 *
 * As with every kind in this checkpoint except EVENT, the backend validates nothing here.
 */
export interface ArticleFieldsProps {
  value: ArticleDetails;
  onChange: (value: ArticleDetails) => void;
}

export function ArticleFields({ value, onChange }: ArticleFieldsProps) {
  const t = useT();

  return (
    <div className="flex flex-col gap-3">
      <Input
        label={t('createPost.article.title')}
        value={value.title ?? ''}
        onChange={(event) => onChange({ ...value, title: event.target.value })}
        placeholder={t('createPost.article.titlePlaceholder')}
      />

      <Textarea
        rows={2}
        label={t('createPost.article.summary')}
        hint={t('createPost.article.summaryHint')}
        value={value.summary ?? ''}
        onChange={(event) => onChange({ ...value, summary: event.target.value })}
      />

      <Input
        mono
        type="url"
        inputMode="url"
        prefix={<Link2 />}
        label={t('createPost.article.coverImage')}
        hint={t('createPost.article.coverImageHint')}
        value={value.coverImage ?? ''}
        onChange={(event) => onChange({ ...value, coverImage: event.target.value })}
        placeholder="https://"
      />
    </div>
  );
}
