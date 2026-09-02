'use client';

import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Button, Dialog, Select } from '@/shared/components';
import { getErrorMessage } from '@/shared/lib/api-error';
import { useT } from '@/core/i18n';
import type { Project, ProjectStatus } from '../types/matchmaking';
import { useDeleteProject, useUpdateProjectStatus } from '../hooks/use-matchmaking';
import { EditProjectDialog } from './edit-project-dialog';

/**
 * The owner's controls for a project as a whole — edit, status, delete. Rendered only when the
 * viewer is the author (`ProjectDetail` computes that from `authorId`); the position-level and
 * member-level controls live in their own files.
 *
 * STATUS IS A ONE-WAY GATE AT THE END. `OPEN ↔ CLOSED` is free, but `COMPLETED` cannot be left —
 * the backend answers 409 on any move out of it — so once a project is `COMPLETED` the select is
 * locked and the edit / delete affordances go with it (a finished project is a record, not a
 * draft). Picking `COMPLETED` is behind a confirm for the same reason.
 *
 * DELETE NAVIGATES, WHICH THE FEATURE CANNOT DO. `features/matchmaking` does not import
 * `next/navigation`; the page passes `onDeleted` so the redirect stays where routing belongs.
 */
export interface ProjectOwnerControlsProps {
  project: Project;
  onDeleted: () => void;
}

const STATUS_OPTIONS: ProjectStatus[] = ['OPEN', 'CLOSED', 'COMPLETED'];

export function ProjectOwnerControls({ project, onDeleted }: ProjectOwnerControlsProps) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pendingComplete, setPendingComplete] = useState(false);

  const status = project.status ?? 'OPEN';
  const isCompleted = status === 'COMPLETED';

  const updateStatus = useUpdateProjectStatus();
  const del = useDeleteProject();

  const changeStatus = (next: ProjectStatus) => {
    if (next === status || project.id == null) return;
    if (next === 'COMPLETED') {
      setPendingComplete(true);
      return;
    }
    updateStatus.mutate({ projectId: project.id, status: next });
  };

  return (
    <div className="flex flex-wrap items-center gap-[var(--nx-space-pair)]">
      <Select
        aria-label={t('projects.manage.changeStatus')}
        size="sm"
        wrapperClassName="w-40"
        value={status}
        disabled={isCompleted || updateStatus.isPending}
        hint={isCompleted ? t('projects.manage.completedFinal') : undefined}
        onChange={(event) => changeStatus(event.target.value as ProjectStatus)}
        options={STATUS_OPTIONS.map((value) => ({
          value,
          label: t(`projects.status.${value}`),
        }))}
      />

      {!isCompleted && (
        <>
          <Button size="sm" variant="secondary" icon={<Pencil />} onClick={() => setEditing(true)}>
            {t('projects.manage.edit')}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            icon={<Trash2 />}
            onClick={() => {
              del.reset();
              setConfirmDelete(true);
            }}
          >
            {t('projects.manage.delete')}
          </Button>
        </>
      )}

      {updateStatus.isError && (
        <p role="alert" className="w-full text-nx-caption text-nx-status-danger-fg">
          {getErrorMessage(updateStatus.error, t('projects.manage.statusError'))}
        </p>
      )}

      <EditProjectDialog project={project} open={editing} onClose={() => setEditing(false)} />

      <Dialog
        open={pendingComplete}
        onClose={() => setPendingComplete(false)}
        title={t('projects.manage.completeConfirmTitle')}
        description={t('projects.manage.completeConfirmDesc')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPendingComplete(false)}>
              {t('projects.cancel')}
            </Button>
            <Button
              loading={updateStatus.isPending}
              onClick={() => {
                if (project.id == null) return;
                updateStatus.mutate(
                  { projectId: project.id, status: 'COMPLETED' },
                  { onSuccess: () => setPendingComplete(false) }
                );
              }}
            >
              {t('projects.manage.completeConfirm')}
            </Button>
          </>
        }
      >
        {updateStatus.isError && (
          <p role="alert" className="text-nx-body-sm text-nx-status-danger-fg">
            {getErrorMessage(updateStatus.error, t('projects.manage.statusError'))}
          </p>
        )}
      </Dialog>

      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={t('projects.manage.deleteConfirmTitle')}
        description={t('projects.manage.deleteConfirmDesc')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              {t('projects.cancel')}
            </Button>
            <Button
              variant="danger"
              loading={del.isPending}
              onClick={() => {
                if (project.id == null) return;
                del.mutate(project.id, {
                  onSuccess: () => {
                    setConfirmDelete(false);
                    onDeleted();
                  },
                });
              }}
            >
              {t('projects.manage.delete')}
            </Button>
          </>
        }
      >
        {del.isError && (
          <p role="alert" className="text-nx-body-sm text-nx-status-danger-fg">
            {getErrorMessage(del.error, t('projects.manage.deleteError'))}
          </p>
        )}
      </Dialog>
    </div>
  );
}
