'use client';

import { useState } from 'react';
import {
  AppealsTab,
  BannedUsersTab,
  ModerationLogsTab,
  ModerationPostsTab,
  ModerationReportsTab,
} from '@/features/moderation';
import { Tabs } from '@/shared/components';
import { useT } from '@/core/i18n';

/**
 * `/admin/moderation` — rewired to `features/moderation` at P2.15cd.
 *
 * The page owns the tab selection and the cross-tab jump, and nothing else: no fetching, no
 * filters, no knowledge of what a post or a ban looks like.
 *
 * THE JUMP IS A REMOUNT, NOT A MESSAGE. Clicking a post id on the banned-users or reports tab
 * switches to the queue with that id pre-filled. It is passed as `initialPostId` and the tab is
 * keyed on it, so React rebuilds the tab with a fresh filter rather than the tab having to watch
 * a prop and reconcile it against filters the user may have since typed. The legacy version did
 * the latter — comparing the incoming id against a remembered copy during render so that two
 * jumps to the same post would not be swallowed — which is a lot of machinery to avoid a remount
 * costing one request.
 *
 * Tab state is deliberately NOT in the URL, unlike `/roadmap`'s `?id=`. A roadmap is a thing you
 * send someone a link to; which of five admin tabs you had open is not.
 */
export default function AdminModerationPage() {
  const t = useT();

  const [tab, setTab] = useState('posts');
  const [jumpToPostId, setJumpToPostId] = useState<number | undefined>();

  const viewPost = (postId: number) => {
    setJumpToPostId(postId);
    setTab('posts');
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-nx-title font-semibold text-nx-text-primary">
          {t('moderation.title')}
        </h1>
        <p className="mt-0.5 text-nx-body-sm text-nx-text-secondary">{t('moderation.subtitle')}</p>
      </div>

      <Tabs
        active={tab}
        onChange={setTab}
        aria-label={t('moderation.title')}
        tabs={[
          { id: 'posts', label: t('moderation.tabs.posts') },
          // Second, right after the queue it feeds. A report is the human input to the same
          // decision the queue makes, and until this tab existed it was the only signal in the
          // system that reached nobody — `POST /moderation/reports` wrote rows that
          // `GET /admin/moderation/reports` was never called to read.
          { id: 'reports', label: t('moderation.tabs.reports') },
          { id: 'logs', label: t('moderation.tabs.logs') },
          { id: 'banned', label: t('moderation.tabs.banned') },
          // Added once users could appeal at all. Without it the product accepts appeals and
          // gives nobody the ability to decide them — a promise of review no screen can keep.
          { id: 'appeals', label: t('moderation.tabs.appeals') },
        ]}
      />

      {/* Only the active tab is mounted, so switching does not leave three lists alive and the
          page does not fetch all three on load. */}
      {tab === 'posts' && (
        <ModerationPostsTab key={jumpToPostId ?? 'all'} initialPostId={jumpToPostId} />
      )}
      {/* Same jump as the banned-users tab: a report names a post id and nothing else, so the
          way to act on one is to open it where the post and its history are. */}
      {tab === 'reports' && <ModerationReportsTab onViewPost={viewPost} />}
      {tab === 'logs' && <ModerationLogsTab />}
      {tab === 'banned' && <BannedUsersTab onViewPost={viewPost} />}
      {tab === 'appeals' && <AppealsTab />}
    </div>
  );
}
