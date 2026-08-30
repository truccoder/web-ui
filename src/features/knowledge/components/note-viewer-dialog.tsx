'use client';

import { Dialog, Skeleton } from '@/shared/components';
import { getErrorMessage } from '@/shared/lib/api-error';
import { useT } from '@/core/i18n';
import { useVaultNote } from '../hooks';

/**
 * The one place in the feature that knows how to show a synced note's body. `VaultNoteList`'s
 * "View" button and `VaultNoteGraph`'s node click both open this — a note has exactly one way to
 * be read back, whether the reader found it in the list or clicked its dot in the graph.
 */
export interface NoteViewerDialogProps {
  noteId: number | null;
  onClose: () => void;
}

export function NoteViewerDialog({ noteId, onClose }: NoteViewerDialogProps) {
  const t = useT();
  const note = useVaultNote(noteId);

  return (
    <Dialog
      open={noteId != null}
      onClose={onClose}
      title={note.data?.filename ?? ''}
      width={720}
      maxHeight="80vh"
    >
      {note.isPending ? (
        <Skeleton lines={8} />
      ) : note.isError ? (
        <p role="alert" className="text-nx-body-sm text-nx-status-danger-fg">
          {getErrorMessage(note.error, t('knowledge.vault.noteError'))}
        </p>
      ) : (
        // The raw markdown, not rendered — see `VaultNoteList`'s note on why: this is the file as
        // the server holds it, not text the model wrote.
        <pre className="whitespace-pre-wrap break-words font-mono text-nx-body-sm text-nx-text-secondary">
          {note.data?.content}
        </pre>
      )}
    </Dialog>
  );
}
