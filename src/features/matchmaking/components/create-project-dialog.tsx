'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button, Dialog, Input, Textarea } from '@/shared/components';
import { getErrorMessage } from '@/shared/lib/api-error';
import { useT } from '@/core/i18n';
import type { CreatePositionInput } from '../types/matchmaking';
import { useCreateProject } from '../hooks/use-matchmaking';

/**
 * Create a project and its roles, in one shot.
 *
 * IT IS ONE SHOT BECAUSE THE API IS. There is no endpoint to add, rename or remove a position
 * afterwards — whatever this form sends is the permanent set — so the dialog has to let someone
 * build the whole list before submitting, and the copy has to say that the list is final rather
 * than implying it can be edited later.
 *
 * IT NAVIGATES TO WHAT IT MADE, which is new. `createProject` used to answer `void` and discard
 * the id the service had already generated, so the creator could not be shown their own project;
 * the backend now returns the full DTO and `onCreated` receives it.
 *
 * SKILLS ARE COMMA-SEPARATED TEXT, not a picker. `requiredSkills` is a free-form `string[]` on the
 * backend with no catalogue behind it — there is no endpoint listing valid skills — so a picker
 * would have to invent its options. It matters more than it looks: `suggestCandidates` matches
 * these strings against professional profiles, and a position with no skills returns an empty
 * shortlist without querying anything.
 *
 * `tags` FOLLOWS THE SAME COMMA-SEPARATED SHAPE (BE `ecc53bb`, B26) and is optional — a project
 * without tags still scores on skill overlap alone in `GET /projects/suggested`, it just carries
 * no weight on the domain half of that match.
 */
export interface CreateProjectDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (projectId: number) => void;
}

const emptyPosition = (): CreatePositionInput => ({
  title: '',
  description: '',
  requiredSkills: [],
});

export function CreateProjectDialog({ open, onClose, onCreated }: CreateProjectDialogProps) {
  const t = useT();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [positions, setPositions] = useState<CreatePositionInput[]>([emptyPosition()]);

  const create = useCreateProject();

  const reset = () => {
    setTitle('');
    setDescription('');
    setTags('');
    setPositions([emptyPosition()]);
    create.reset();
  };

  const close = () => {
    onClose();
    reset();
  };

  const updatePosition = (index: number, patch: Partial<CreatePositionInput>) =>
    setPositions((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  // `title` and `description` are `@NotBlank` server-side; a position row is only sent if it has a
  // title, so an untouched blank row is dropped rather than rejected.
  const filled = positions.filter((position) => position.title.trim().length > 0);
  const canSubmit = title.trim().length > 0 && description.trim().length > 0 && !create.isPending;

  return (
    <Dialog
      open={open}
      onClose={close}
      width={560}
      maxHeight="80vh"
      title={t('projects.create.title')}
      description={t('projects.create.desc')}
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            {t('projects.cancel')}
          </Button>
          <Button
            loading={create.isPending}
            disabled={!canSubmit}
            onClick={() =>
              create.mutate(
                {
                  title: title.trim(),
                  description: description.trim(),
                  tags: tags
                    .split(',')
                    .map((tag) => tag.trim())
                    .filter(Boolean),
                  positions: filled.map((position) => ({
                    ...position,
                    title: position.title.trim(),
                    description: position.description?.trim() || undefined,
                  })),
                },
                {
                  onSuccess: (project) => {
                    close();
                    if (project.id != null) onCreated?.(project.id);
                  },
                }
              )
            }
          >
            {t('projects.create.submit')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Input
          label={t('projects.create.projectTitle')}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={t('projects.create.projectTitlePlaceholder')}
        />

        <Textarea
          rows={4}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder={t('projects.create.descriptionPlaceholder')}
          aria-label={t('projects.create.description')}
        />

        <Input
          label={t('projects.create.tags')}
          value={tags}
          onChange={(event) => setTags(event.target.value)}
          placeholder={t('projects.create.tagsPlaceholder')}
        />

        <div className="flex flex-col gap-3">
          <p className="text-nx-body-sm font-medium text-nx-text-primary">
            {t('projects.create.positions')}
          </p>
          {/* Said in the form rather than in a tooltip, because it is the one thing about this
              dialog a person could not guess and cannot undo. */}
          <p className="text-nx-caption text-nx-text-muted">{t('projects.create.positionsNote')}</p>

          {positions.map((position, index) => (
            <div
              key={index}
              className="flex flex-col gap-2 rounded-nx-sm border border-nx-border-default bg-nx-surface-sunken p-3"
            >
              <div className="flex items-center gap-2">
                <Input
                  className="flex-1"
                  value={position.title}
                  onChange={(event) => updatePosition(index, { title: event.target.value })}
                  placeholder={t('projects.create.positionTitlePlaceholder')}
                  aria-label={t('projects.create.positionTitle')}
                />
                {positions.length > 1 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<X />}
                    aria-label={t('projects.create.removePosition')}
                    onClick={() => setPositions((prev) => prev.filter((_, i) => i !== index))}
                  />
                )}
              </div>

              <Input
                value={(position.requiredSkills ?? []).join(', ')}
                onChange={(event) =>
                  updatePosition(index, {
                    requiredSkills: event.target.value
                      .split(',')
                      .map((skill) => skill.trim())
                      .filter(Boolean),
                  })
                }
                placeholder={t('projects.create.skillsPlaceholder')}
                aria-label={t('projects.create.skills')}
              />
            </div>
          ))}

          <Button
            size="sm"
            variant="secondary"
            icon={<Plus />}
            onClick={() => setPositions((prev) => [...prev, emptyPosition()])}
          >
            {t('projects.create.addPosition')}
          </Button>
        </div>

        {create.isError && (
          <p role="alert" className="text-nx-body-sm text-nx-status-danger-fg">
            {getErrorMessage(create.error, t('projects.create.error'))}
          </p>
        )}
      </div>
    </Dialog>
  );
}
