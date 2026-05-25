'use client';

import { CreatePostForm } from '@/components/posts/create-post-form';
import { Newsfeed } from '@/components/posts/newsfeed';

export default function NewsfeedPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bảng tin</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Cập nhật mới nhất từ bạn bè và những người bạn theo dõi
        </p>
      </div>

      <CreatePostForm />

      <Newsfeed />
    </div>
  );
}
