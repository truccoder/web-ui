'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useT } from '@/lib/i18n';
import { LibraryTab } from '@/components/knowledge/library-tab';
import { ProfessionalProfileTab } from '@/components/knowledge/professional-profile-tab';
import { TokensTab } from '@/components/knowledge/tokens-tab';

export default function KnowledgePage() {
  const t = useT();
  const [tab, setTab] = useState('library');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('knowledge.title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('knowledge.subtitle')}</p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as string)} className="space-y-6">
        <TabsList>
          <TabsTrigger value="library">{t('knowledge.tabs.library')}</TabsTrigger>
          <TabsTrigger value="profile">{t('knowledge.tabs.profile')}</TabsTrigger>
          <TabsTrigger value="tokens">{t('knowledge.tabs.tokens')}</TabsTrigger>
        </TabsList>

        <TabsContent value="library">
          <LibraryTab />
        </TabsContent>

        <TabsContent value="profile">
          <ProfessionalProfileTab />
        </TabsContent>

        <TabsContent value="tokens">
          <TokensTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
