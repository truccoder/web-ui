'use client';

import { Input, Textarea } from '@/shared/components';
import { ImageUrlField } from '@/features/media';
import { useT } from '@/core/i18n';
import type { ArticleDetails } from '../types/post';

/**
 * `ARTICLE` payload — `articleDetails: { title, coverImage, summary }`. The article *body* is
 * the post's `content`; `summary` is the teaser the feed card shows.
 *
 * `coverImage` TAKES A URL *OR* AN UPLOAD. It was URL-only for as long as the backend had no
 * general-purpose file endpoint; `POST /v1/api/media` (B16) is that endpoint, so `ImageUrlField`
 * now offers both — paste a link, or send a file from the device and store the URL it returns.
 * The stored value is a URL either way.
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

      <ImageUrlField
        label={t('createPost.article.coverImage')}
        hint={t('createPost.article.coverImageHint')}
        value={value.coverImage ?? ''}
        onChange={(coverImage) => onChange({ ...value, coverImage })}
      />
    </div>
  );
}
