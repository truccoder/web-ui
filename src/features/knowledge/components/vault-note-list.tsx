'use client';

import * as React from 'react';
import { Eye, Trash2 } from 'lucide-react';
import { Badge, Button, Dialog, EmptyState, Skeleton } from '@/shared/components';
import { getErrorMessage } from '@/shared/lib/api-error';
import { formatDate, useIntlLocale } from '@/shared/lib/format';
import { useT } from '@/core/i18n';
import { useDeleteAllVaultNotes, useDeleteVaultNote, useVaultNotes } from '../hooks';
import type { VaultNoteSummary } from '../types/knowledge';
import { NoteViewerDialog } from './note-viewer-dialog';

/**
 * The notes the user's Obsidian vault has pushed to the server.
 *
 * WHY THIS SCREEN EXISTS. `KnowledgeSyncService.push` accepts up to 500 notes per request and
 * stores them against the user, and until the `/knowledge/vault` endpoints there was nothing —
 * anywhere in the product — that let the person those notes belong to see what was held or remove
 * it. The token screen next to this one issues the credential that lets the notes in; this is the
 * other half of that bargain.
 *
 * THE COPY IS CAREFUL ABOUT WHAT DELETING MEANS, and that is not padding. This list is the
 * SERVER'S COPY. Deleting a row does not touch the vault on the user's disk, and it does not stop
 * the plugin pushing the same note again on its next sync — so a button labelled "Delete" with no
 * further words would be making a promise the backend cannot keep.
 *
 * BODIES ARE NOT IN THE LIST PAYLOAD. `listNotes` returns filenames, tags and links only; opening
 * a note is a second request. That is also, deliberately, the same set of fields
 * `ExplanationService.loadVaultContext` sends to the model — so this list shows the reader exactly
 * what the AI is told about them, and nothing here implies the bodies are sent, because they
 * are not.
 */
export function VaultNoteList() {
  const t = useT();
  const localeTag = useIntlLocale();
  const { data, isPending, isError, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useVaultNotes();
  const deleteNote = useDeleteVaultNote();
  const deleteAll = useDeleteAllVaultNotes();

  const [pending, setPending] = React.useState<VaultNoteSummary | null>(null);
  const [confirmingWipe, setConfirmingWipe] = React.useState(false);
  const [openNoteId, setOpenNoteId] = React.useState<number | null>(null);

  const notes = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="space-y-3">
      {/**
       * NO `<h2>` HERE ANY MORE — report §3.6 (C001).
       *
       * `/settings/vault` rendered the heading TWICE: this one, from `knowledge.vault.title`, sat
       * directly under the `<Section>` heading the page wraps this component in, from
       * `settings.vault.title`. Two different i18n keys carrying the identical Vietnamese string
       * `'Ghi chú đã đồng bộ'` (`vi.ts:117` and `vi.ts:1544`), one above the other, each with its
       * own and slightly contradictory description of the same thing.
       *
       * The cause is written in the page's own note: this block was MOVED here from `/knowledge`,
       * and it brought its heading with it while the destination supplied one of its own. The
       * component keeps the row — the clear-all button lives on it — and gives up the title, which
       * now belongs to whoever mounts it.
       *
       * `scripts/i18n-parity.mjs` could not have caught this: it compares vi against en and their
       * placeholders, not two keys against each other, and it has no idea which keys land on one
       * screen together.
       */}
      <div className="flex items-center justify-end gap-3">
        {notes.length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            icon={<Trash2 className="h-3.5 w-3.5" />}
            onClick={() => {
              deleteAll.reset();
              setConfirmingWipe(true);
            }}
          >
            {t('knowledge.vault.deleteAll')}
          </Button>
        )}
      </div>

      <p className="text-nx-body-sm text-nx-text-secondary">{t('knowledge.vault.desc')}</p>

      {isPending ? (
        <Skeleton lines={3} />
      ) : isError ? (
        <p role="alert" className="text-nx-caption text-nx-status-danger-fg">
          {getErrorMessage(error, t('knowledge.vault.loadError'))}
        </p>
      ) : notes.length === 0 ? (
        <EmptyState
          compact
          title={t('knowledge.vault.emptyTitle')}
          description={t('knowledge.vault.emptyDesc')}
        />
      ) : (
        <>
          <ul className="divide-y divide-nx-border-subtle">
            {notes.map((item) => (
              <li key={item.id} className="flex items-center gap-3 py-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-mono text-nx-body-sm text-nx-text-primary">
                    {item.filename}
                  </div>
                  <div className="text-nx-caption text-nx-text-muted">
                    {t('knowledge.vault.syncedOn', {
                      date: formatDate(item.updatedAt ?? undefined, localeTag) ?? '',
                    })}
                  </div>
                </div>

                {/* Capped at three. A note with twenty tags would push the row's controls off
                    screen, and the point here is to show the SHAPE of what the AI receives, not
                    to reproduce the note's front matter. */}
                <div className="hidden shrink-0 gap-1 sm:flex">
                  {(item.tags ?? []).slice(0, 3).map((tag) => (
                    <Badge key={tag}>{tag}</Badge>
                  ))}
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  icon={<Eye className="h-3.5 w-3.5" />}
                  aria-label={t('knowledge.vault.viewAria', { name: item.filename ?? '' })}
                  disabled={item.id == null}
                  onClick={() => item.id != null && setOpenNoteId(item.id)}
                >
                  {t('knowledge.vault.view')}
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  icon={<Trash2 className="h-3.5 w-3.5" />}
                  aria-label={t('knowledge.vault.deleteAria', { name: item.filename ?? '' })}
                  disabled={item.id == null}
                  onClick={() => {
                    deleteNote.reset();
                    setPending(item);
                  }}
                >
                  {t('knowledge.vault.delete')}
                </Button>
              </li>
            ))}
          </ul>

          {hasNextPage && (
            <Button
              size="sm"
              variant="secondary"
              loading={isFetchingNextPage}
              disabled={isFetchingNextPage}
              onClick={() => fetchNextPage()}
            >
              {t('knowledge.vault.loadMore')}
            </Button>
          )}
        </>
      )}

      <NoteViewerDialog noteId={openNoteId} onClose={() => setOpenNoteId(null)} />

      <Dialog
        open={pending != null}
        onClose={() => setPending(null)}
        title={t('knowledge.vault.deleteTitle')}
        description={t('knowledge.vault.deleteDesc', { name: pending?.filename ?? '' })}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPending(null)}>
              {t('knowledge.vault.deleteCancel')}
            </Button>
            <Button
              variant="danger"
              loading={deleteNote.isPending}
              disabled={deleteNote.isPending}
              onClick={() => {
                if (pending?.id == null) return;
                deleteNote.mutate(pending.id, { onSuccess: () => setPending(null) });
              }}
            >
              {t('knowledge.vault.deleteConfirm')}
            </Button>
          </>
        }
      >
        {deleteNote.isError && (
          <p role="alert" className="text-nx-body-sm text-nx-status-danger-fg">
            {getErrorMessage(deleteNote.error, t('knowledge.vault.deleteError'))}
          </p>
        )}
      </Dialog>

      <Dialog
        open={confirmingWipe}
        onClose={() => setConfirmingWipe(false)}
        title={t('knowledge.vault.deleteAllTitle')}
        // The count comes from what has been LOADED so far, so it undercounts a vault whose later
        // pages have not been fetched. `${count}+` rather than a bare number, because promising
        // "all 10 notes" while deleting 400 would be the one number on this screen that lies.
        description={t('knowledge.vault.deleteAllDesc', {
          count: hasNextPage ? `${notes.length}+` : notes.length,
        })}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmingWipe(false)}>
              {t('knowledge.vault.deleteCancel')}
            </Button>
            <Button
              variant="danger"
              loading={deleteAll.isPending}
              disabled={deleteAll.isPending}
              onClick={() =>
                deleteAll.mutate(undefined, { onSuccess: () => setConfirmingWipe(false) })
              }
            >
              {t('knowledge.vault.deleteAllConfirm')}
            </Button>
          </>
        }
      >
        {deleteAll.isError && (
          <p role="alert" className="text-nx-body-sm text-nx-status-danger-fg">
            {getErrorMessage(deleteAll.error, t('knowledge.vault.deleteError'))}
          </p>
        )}
      </Dialog>
    </div>
  );
}
