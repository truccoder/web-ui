'use client';

import { CreatePostForm } from '@/components/posts/create-post-form';
import { Newsfeed } from '@/components/posts/newsfeed';
import { useT } from '@/lib/i18n';

export default function NewsfeedPage() {
  const t = useT();

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('newsfeed.title')}</h1>
        <p className="text-muted-foreground text-sm mt-0.5">{t('newsfeed.subtitle')}</p>
      </div>

      <CreatePostForm />

      <Newsfeed />
    </div>
  );
}
