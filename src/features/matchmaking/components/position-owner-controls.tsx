'use client';

import { useState } from 'react';
import { Lock, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button, Dialog, Input, Textarea } from '@/shared/components';
import { getErrorMessage } from '@/shared/lib/api-error';
import { useT } from '@/core/i18n';
import type { CreatePositionInput, ProjectPosition } from '../types/matchmaking';
import {
  useAddPosition,
  useDeletePosition,
  useUpdatePosition,
  useUpdatePositionStatus,
} from '../hooks/use-matchmaking';

/**
 * The owner's per-position controls, split from `PositionCard` so the visitor-facing card stays
 * unchanged. Three surfaces:
 *
 *  - `AddPositionButton` — a role can be added after creation now (`POST /{id}/positions`), which
 *    `CreateProjectDialog`'s "this list is final" copy predates. Hidden once the project is
 *    `COMPLETED` (the backend answers 409).
 *  - `PositionOwnerControls` — edit, open/close, delete for one role.
 *
 * WHAT THE BACKEND REFUSES, AND WHY THE UI SHAPES AROUND IT rather than letting the call fail:
 *  - `FILLED` is not settable by hand (400), and reopening a full role is 409 — so the toggle is
 *    only offered for `OPEN`/`CLOSED`, and a `FILLED` role shows nothing but its badge.
 *  - lowering `quantity` below the seats already `ACCEPTED` is 409 — surfaced as a form error.
 *  - deleting a role with an `ACCEPTED` member on it is 409 — surfaced on the confirm dialog.
 */

const emptyPosition = (): CreatePositionInput => ({
  title: '',
  description: '',
  requiredSkills: [],
  quantity: 1,
});

function toForm(position: ProjectPosition): CreatePositionInput {
  return {
    title: position.title ?? '',
    description: position.description ?? '',
    requiredSkills: position.requiredSkills ?? [],
    quantity: position.quantity ?? 1,
  };
}

/**
 * The role editor — one dialog shared by add and edit. `PositionFields` is lifted straight from
 * `CreateProjectDialog`'s per-position block so a role reads the same everywhere it is entered.
 */
function PositionFormDialog({
  open,
  onClose,
  title,
  initial,
  submitLabel,
  loading,
  error,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  initial: CreatePositionInput;
  submitLabel: string;
  loading: boolean;
  error: string | null;
  onSubmit: (value: CreatePositionInput) => void;
}) {
  const t = useT();
  const [value, setValue] = useState<CreatePositionInput>(initial);

  // Re-seed on each opening — React's documented "adjust state while rendering" pattern, so a
  // cancelled edit does not carry into the next open and no effect is needed.
  const [wasOpen, setWasOpen] = useState(false);
  if (open && !wasOpen) {
    setWasOpen(true);
    setValue(initial);
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  const patch = (next: Partial<CreatePositionInput>) => setValue((prev) => ({ ...prev, ...next }));
  const canSubmit = value.title.trim().length > 0 && !loading;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      width={520}
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('projects.cancel')}
          </Button>
          <Button
            loading={loading}
            disabled={!canSubmit}
            onClick={() =>
              onSubmit({
                title: value.title.trim(),
                description: value.description?.trim() || undefined,
                requiredSkills: value.requiredSkills ?? [],
                quantity: value.quantity && value.quantity >= 1 ? value.quantity : 1,
              })
            }
          >
            {submitLabel}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <Input
          value={value.title}
          onChange={(event) => patch({ title: event.target.value })}
          placeholder={t('projects.create.positionTitlePlaceholder')}
          label={t('projects.create.positionTitle')}
        />
        <Input
          value={(value.requiredSkills ?? []).join(', ')}
          onChange={(event) =>
            patch({
              requiredSkills: event.target.value
                .split(',')
                .map((skill) => skill.trim())
                .filter(Boolean),
            })
          }
          placeholder={t('projects.create.skillsPlaceholder')}
          label={t('projects.create.skills')}
        />
        <Textarea
          rows={2}
          value={value.description ?? ''}
          onChange={(event) => patch({ description: event.target.value })}
          placeholder={t('projects.create.positionDescriptionPlaceholder')}
          aria-label={t('projects.create.positionDescription')}
        />
        <Input
          type="number"
          min={1}
          value={String(value.quantity ?? 1)}
          onChange={(event) => {
            const n = Number(event.target.value);
            patch({ quantity: Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1 });
          }}
          label={t('projects.create.positionQuantity')}
          hint={t('projects.create.positionQuantityHint')}
          wrapperClassName="w-32"
        />
        {error && (
          <p role="alert" className="text-nx-body-sm text-nx-status-danger-fg">
            {error}
          </p>
        )}
      </div>
    </Dialog>
  );
}

export function AddPositionButton({ projectId }: { projectId: number }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const add = useAddPosition();

  return (
    <>
      <Button
        size="sm"
        variant="secondary"
        icon={<Plus />}
        onClick={() => {
          add.reset();
          setOpen(true);
        }}
      >
        {t('projects.manage.addRole')}
      </Button>
      <PositionFormDialog
        open={open}
        onClose={() => setOpen(false)}
        title={t('projects.manage.addRole')}
        initial={emptyPosition()}
        submitLabel={t('projects.manage.addRole')}
        loading={add.isPending}
        error={add.isError ? getErrorMessage(add.error, t('projects.manage.roleSaveError')) : null}
        onSubmit={(value) =>
          add.mutate({ projectId, payload: value }, { onSuccess: () => setOpen(false) })
        }
      />
    </>
  );
}

export function PositionOwnerControls({ position }: { position: ProjectPosition }) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const update = useUpdatePosition();
  const updateStatus = useUpdatePositionStatus();
  const del = useDeletePosition();

  if (position.id == null) return null;
  const positionId = position.id;
  const status = position.status ?? 'OPEN';
  const isFilled = status === 'FILLED';
  const busy = update.isPending || updateStatus.isPending || del.isPending;

  return (
    <div className="mt-[var(--nx-space-tight)] flex flex-wrap items-center gap-[var(--nx-space-pair)] border-t border-nx-border-subtle pt-[var(--nx-space-tight)]">
      <Button
        size="sm"
        variant="ghost"
        icon={<Pencil />}
        disabled={busy}
        onClick={() => {
          update.reset();
          setEditing(true);
        }}
      >
        {t('projects.manage.editRole')}
      </Button>

      {isFilled ? (
        <span className="inline-flex items-center gap-1 text-nx-caption text-nx-text-muted">
          <Lock className="size-3" aria-hidden />
          {t('projects.positionStatus.FILLED')}
        </span>
      ) : (
        <Button
          size="sm"
          variant="ghost"
          disabled={busy}
          onClick={() =>
            updateStatus.mutate({
              positionId,
              status: status === 'OPEN' ? 'CLOSED' : 'OPEN',
            })
          }
        >
          {status === 'OPEN' ? t('projects.manage.closeRole') : t('projects.manage.reopenRole')}
        </Button>
      )}

      <Button
        size="sm"
        variant="ghost"
        icon={<Trash2 />}
        disabled={busy}
        onClick={() => {
          del.reset();
          setConfirmDelete(true);
        }}
      >
        {t('projects.manage.deleteRole')}
      </Button>

      {updateStatus.isError && (
        <p role="alert" className="w-full text-nx-caption text-nx-status-danger-fg">
          {getErrorMessage(updateStatus.error, t('projects.manage.roleStatusError'))}
        </p>
      )}

      <PositionFormDialog
        open={editing}
        onClose={() => setEditing(false)}
        title={t('projects.manage.editRole')}
        initial={toForm(position)}
        submitLabel={t('projects.manage.save')}
        loading={update.isPending}
        error={
          update.isError
            ? getErrorMessage(update.error, t('projects.manage.positionQuantityLow'))
            : null
        }
        onSubmit={(value) =>
          update.mutate({ positionId, payload: value }, { onSuccess: () => setEditing(false) })
        }
      />

      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={t('projects.manage.deleteRoleConfirmTitle')}
        description={t('projects.manage.deleteRoleConfirmDesc')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              {t('projects.cancel')}
            </Button>
            <Button
              variant="danger"
              loading={del.isPending}
              onClick={() => del.mutate(positionId, { onSuccess: () => setConfirmDelete(false) })}
            >
              {t('projects.manage.deleteRole')}
            </Button>
          </>
        }
      >
        {del.isError && (
          <p role="alert" className="text-nx-body-sm text-nx-status-danger-fg">
            {getErrorMessage(del.error, t('projects.manage.positionHasMembers'))}
          </p>
        )}
      </Dialog>
    </div>
  );
}
