'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Button, Tabs } from '@/shared/components';
import { CreateProjectDialog, MyApplications, ProjectList } from '@/features/matchmaking';
import { useT } from '@/core/i18n';

/**
 * `/projects` — the matchmaking board. Owning domain: `matchmaking`.
 *
 * THE ROUTE THIS PROJECT WROTE OFF. `matchmaking` had types, api and hooks since P2.16ab and no
 * screen at all, recorded in the migration ledger as "không dựng được màn nào mà không bịa dữ
 * liệu": no endpoint listed projects, positions or applications, so the ids the write endpoints
 * needed could not be obtained. `GET /projects` and its siblings removed that, and this is the
 * surface they unlock.
 *
 * TWO TABS, LOCAL STATE. `Bảng dự án` is everyone's; `Đơn của tôi` is yours. They are state rather
 * than routes because neither ever had a URL for anyone to be holding a link to — the opposite of
 * `/friends`, whose three tabs were three pre-existing routes.
 *
 * CREATING OPENS WHAT IT MADE. That is only possible because `createProject` returns the project
 * with its id now; while it answered `void`, a creator had no way to reach their own project and
 * the honest UI would have been a form that says "sent" and stops.
 */
export default function ProjectsPage() {
  const t = useT();
  const router = useRouter();
  const [tab, setTab] = useState('board');
  const [creating, setCreating] = useState(false);

  return (
    <div className="flex flex-col gap-[var(--nx-space-section)]">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-nx-title font-semibold tracking-tight text-nx-text-primary">
            {t('projects.title')}
          </h1>
          <p className="mt-1 text-nx-body-sm text-nx-text-muted">{t('projects.subtitle')}</p>
        </div>
        <Button size="sm" icon={<Plus />} onClick={() => setCreating(true)}>
          {t('projects.create.action')}
        </Button>
      </div>

      <Tabs
        aria-label={t('projects.title')}
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'board', label: t('projects.tabs.board') },
          { id: 'mine', label: t('projects.tabs.mine') },
        ]}
      />

      {tab === 'board' ? <ProjectList /> : <MyApplications />}

      <CreateProjectDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(projectId) => router.push(`/projects/${projectId}`)}
      />
    </div>
  );
}
