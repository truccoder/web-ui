'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PostsTab } from '@/components/moderation/posts-tab';
import { LogsTab } from '@/components/moderation/logs-tab';
import { BannedUsersTab } from '@/components/moderation/banned-users-tab';
import { useT } from '@/lib/i18n';

export default function AdminModerationPage() {
  const t = useT();
  const [tab, setTab] = useState('posts');
  const [jumpToPostId, setJumpToPostId] = useState<number | undefined>();

  const handleViewPost = (postId: number) => {
    setJumpToPostId(postId);
    setTab('posts');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('admin.moderation.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('admin.moderation.subtitle')}</p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as string)} className="space-y-6">
        <TabsList>
          <TabsTrigger value="posts">{t('admin.moderation.tabs.posts')}</TabsTrigger>
          <TabsTrigger value="logs">{t('admin.moderation.tabs.logs')}</TabsTrigger>
          <TabsTrigger value="banned">{t('admin.moderation.tabs.banned')}</TabsTrigger>
        </TabsList>

        <TabsContent value="posts">
          <PostsTab jumpToPostId={jumpToPostId} />
        </TabsContent>

        <TabsContent value="logs">
          <LogsTab />
        </TabsContent>

        <TabsContent value="banned">
          <BannedUsersTab onViewPost={handleViewPost} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
