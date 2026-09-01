'use client';

import { Suspense, useState } from 'react';
import {
  AppealsTab,
  BannedUsersTab,
  ModerationLogsTab,
  ModerationPostsTab,
  ModerationReportsTab,
} from '@/features/moderation';
import { NewsfeedRebuildPanel } from '@/features/newsfeed';
import { Card, Tabs } from '@/shared/components';
import { useTabParam } from '@/shared/lib/use-tab-param';
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
 * TAB STATE IS NOW IN THE URL, REVERSING WHAT THIS COMMENT USED TO SAY. The old ruling was that
 * "which of five admin tabs you had open" is not a thing you send someone a link to, unlike
 * `/roadmap`'s `?id=`. That is still true about LINKS and it was the wrong test: the parameter is
 * not carrying a link, it is carrying the tab across a RELOAD. A moderator working the appeals
 * queue who refreshes — or follows a link out to a post and comes back — was being dropped onto
 * the posts queue every time, with the page number reset underneath them. Five tabs is exactly
 * the count at which that stops being a shrug.
 *
 * It replaces rather than pushes, so Back still leaves the admin area in one press instead of
 * walking backwards through every tab that was opened.
 */
const TAB_IDS = ['posts', 'reports', 'logs', 'banned', 'appeals', 'system'] as const;

export default function AdminModerationPage() {
  // `useTabParam` reads the query string, which needs a Suspense boundary in the App Router.
  return (
    <Suspense>
      <AdminModerationContent />
    </Suspense>
  );
}

function AdminModerationContent() {
  const t = useT();

  const [tab, setTab] = useTabParam(TAB_IDS, 'posts');
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

      {/* THE STRIP BINDS DOWN TO THE PANEL, and on this page the step is 20 above → 12 below
          rather than 40 → 16. What makes the group read is the RATIO, not the number: the admin
          canvas is deliberately denser than `/profile` or `/library`, and 16 under a 20 would have
          been the same symmetric float the wide pages had, just tighter. */}
      <div className="flex flex-col gap-[var(--nx-space-element)]">
        {/* THE WHITE CARD IS `/newsfeed`'s OWN GROUND, carried here — `Tabs` paints no fill of
            its own, see its header. `padding "0 10px"` matches the `p-2.5` `/newsfeed`'s
            `StickyBlock` row spends around the same strip. */}
        <Card padding="0 10px" className="flex">
          <Tabs
            active={tab}
            onChange={setTab}
            aria-label={t('moderation.title')}
            className="flex-1"
            tabs={[
              { id: 'posts', label: t('moderation.tabs.posts') },
              // Second, right after the queue it feeds. A report is the human input to the same
              // decision the queue makes, and until this tab existed it was the only signal in
              // the system that reached nobody — `POST /moderation/reports` wrote rows that
              // `GET /admin/moderation/reports` was never called to read.
              { id: 'reports', label: t('moderation.tabs.reports') },
              { id: 'logs', label: t('moderation.tabs.logs') },
              { id: 'banned', label: t('moderation.tabs.banned') },
              // Added once users could appeal at all. Without it the product accepts appeals and
              // gives nobody the ability to decide them — a promise of review no screen can keep.
              { id: 'appeals', label: t('moderation.tabs.appeals') },
              // Operational, not a queue: the newsfeed rebuild and anything else that is a
              // one-off maintenance action rather than a stream of items to work through.
              { id: 'system', label: t('moderation.tabs.system') },
            ]}
          />
        </Card>

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
        {tab === 'system' && <NewsfeedRebuildPanel />}
      </div>
    </div>
  );
}
