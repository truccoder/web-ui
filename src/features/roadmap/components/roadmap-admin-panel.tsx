'use client';

import { useState } from 'react';
import { Button, Input, Select, Textarea } from '@/shared/components';
import { useT } from '@/core/i18n';
import { getErrorMessage } from '@/shared/lib/api-error';
import { cn } from '@/shared/lib/cn';
import {
  useCreateRoadmap,
  useCreateRoadmapNode,
  useIsRoadmapAdmin,
  useRoadmapNodes,
} from '../hooks/use-roadmap';

/**
 * Authoring: create a roadmap, and add skills to the one currently open.
 *
 * SAME COURTESY GATE, SAME NON-GUARANTEE as `PendingVerificationQueue` — `useIsRoadmapAdmin`
 * hides this, the backend enforces nothing (B20). Hiding it is right and is not protection.
 *
 * TWO FORMS, ONE COMPONENT, and that is a boundary decision rather than a filing convenience.
 * Adding a node needs a roadmap to add it to, and the parent picker needs that roadmap's existing
 * nodes; splitting them would mean two components sharing the same selected-roadmap prop and the
 * same node query, which is one surface pretending to be two. The forms are independent inside —
 * neither reads the other's state.
 *
 * THE ROADMAP FORM DOES NOT PRESELECT WHAT IT CREATES. `createRoadmap` echoes the request back
 * with an id patched in rather than re-reading the row, so the object it hands back is the
 * caller's own input; the list refetches and the admin picks the new track deliberately. Trusting
 * the echo would seed a selection from data the database never confirmed.
 */
export interface RoadmapAdminPanelProps {
  /** The roadmap the node form adds to. Without one, that half explains itself and stays idle. */
  roadmapId?: number;
  className?: string;
}

export function RoadmapAdminPanel({ roadmapId, className }: RoadmapAdminPanelProps) {
  const t = useT();
  const { isAdmin, isPending: rolePending } = useIsRoadmapAdmin();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [nodeName, setNodeName] = useState('');
  const [parentNodeId, setParentNodeId] = useState('');

  const createRoadmap = useCreateRoadmap({
    onSuccess: () => {
      setName('');
      setDescription('');
    },
  });
  const createNode = useCreateRoadmapNode({
    onSuccess: () => {
      setNodeName('');
      setParentNodeId('');
    },
  });

  // The parent picker offers the nodes already on this roadmap. The backend accepts a parent from
  // a DIFFERENT roadmap without complaint, which would produce a node this app then renders as an
  // orphaned root — so the choices are restricted to the ones that can be drawn correctly.
  const nodes = useRoadmapNodes(isAdmin ? roadmapId : undefined);

  if (rolePending) return null;
  if (!isAdmin) return null;

  return (
    <div className={cn('flex flex-col gap-5', className)}>
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!name.trim() || createRoadmap.isPending) return;
          createRoadmap.mutate({
            name: name.trim(),
            // Blank becomes undefined rather than "": the column is nullable and an empty string
            // would render as a description that is present but says nothing.
            description: description.trim() || undefined,
          });
        }}
      >
        <h3 className="text-nx-ui font-semibold text-nx-text-primary">
          {t('roadmap.admin.newRoadmap')}
        </h3>

        <Input
          label={t('roadmap.admin.roadmapName')}
          value={name}
          onChange={(event) => setName(event.target.value)}
          // Trimmed-empty is blocked here because the backend answers 422 with per-field
          // `details` for a blank `@NotBlank` name, and a round trip to learn that is a round
          // trip wasted. The server stays the authority; this only avoids the obvious case.
          error={createRoadmap.isError ? getErrorMessage(createRoadmap.error) : undefined}
        />

        <Textarea
          label={t('roadmap.admin.roadmapDescription')}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={2}
        />

        <div>
          <Button type="submit" size="sm" loading={createRoadmap.isPending} disabled={!name.trim()}>
            {t('roadmap.admin.createRoadmap')}
          </Button>
        </div>
      </form>

      <form
        className="flex flex-col gap-3 border-t border-nx-border-subtle pt-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (roadmapId === undefined || !nodeName.trim() || createNode.isPending) return;
          createNode.mutate({
            roadmapId,
            payload: {
              name: nodeName.trim(),
              parentNodeId: parentNodeId ? Number(parentNodeId) : undefined,
              // `orderIndex` is deliberately not offered. The backend defaults it to 0 and there
              // is no endpoint to reorder afterwards, so a number typed here would be permanent
              // and unfixable through the UI — worse than letting every node share 0 and letting
              // the tree fall back to its id tiebreak. Add it with a reorder endpoint, not before.
            },
          });
        }}
      >
        <h3 className="text-nx-ui font-semibold text-nx-text-primary">
          {t('roadmap.admin.newNode')}
        </h3>

        {roadmapId === undefined ? (
          <p className="text-nx-body-sm text-nx-text-muted">{t('roadmap.admin.pickRoadmap')}</p>
        ) : (
          <>
            <Input
              label={t('roadmap.admin.nodeName')}
              value={nodeName}
              onChange={(event) => setNodeName(event.target.value)}
              error={createNode.isError ? getErrorMessage(createNode.error) : undefined}
            />

            <Select
              label={t('roadmap.admin.parentNode')}
              value={parentNodeId}
              onChange={(event) => setParentNodeId(event.target.value)}
              options={[
                { value: '', label: t('roadmap.admin.noParent') },
                ...(nodes.data ?? []).map((node) => ({
                  value: String(node.id),
                  label: node.name,
                })),
              ]}
              hint={t('roadmap.admin.parentHint')}
            />

            <div>
              <Button
                type="submit"
                size="sm"
                loading={createNode.isPending}
                disabled={!nodeName.trim()}
              >
                {t('roadmap.admin.createNode')}
              </Button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
