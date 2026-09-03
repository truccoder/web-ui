'use client';

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { vaultApi } from '../api';
import { knowledgeKeys } from './keys';

/**
 * State for the synced-notes surface.
 *
 * NOTHING HERE IS PREFETCHED OR POLLED. These rows are somebody's personal notes; the app reads
 * them when the person asks to look, and not otherwise.
 */

/**
 * The note list, paged.
 *
 * `useInfiniteQuery` because a vault is unbounded — 500 notes per push, and the plugin pages when
 * it has more. `hasMore` comes from the server rather than being inferred from a short page: the
 * backend fetches `limit + 1` rows to answer it, so a page that happens to be exactly `limit` long
 * is correctly reported as "there is more" instead of ending the list early.
 */
export function useVaultNotes(enabled = true) {
  return useInfiniteQuery({
    queryKey: knowledgeKeys.vaultNotes,
    queryFn: ({ pageParam }: { pageParam: number | undefined }) => vaultApi.listNotes(pageParam),
    initialPageParam: undefined as number | undefined,
    // `nextCursor` is non-null on a full last page too, so `hasMore` is what decides — returning
    // the cursor alone would leave the list asking for an empty page forever.
    getNextPageParam: (last) => (last.hasMore ? (last.nextCursor ?? undefined) : undefined),
    enabled,
  });
}

/**
 * One note's body.
 *
 * Separate from the list on purpose: `listNotes` deliberately omits `content`, so opening a note
 * is a second request. Keyed by id so two notes read in one session are both cached.
 */
export function useVaultNote(noteId: number | null) {
  return useQuery({
    queryKey: [...knowledgeKeys.vaultNotes, noteId],
    queryFn: () => vaultApi.getNote(noteId as number),
    enabled: noteId != null,
  });
}

/**
 * Remove the server's copy of one note.
 *
 * INVALIDATES THE LIST RATHER THAN SPLICING THE ROW OUT. The list is paged, and removing a row
 * from a cached page leaves every later page's cursor pointing one row off — a refetch is cheap
 * and correct where a local edit is neither.
 */
export function useDeleteVaultNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (noteId: number) => vaultApi.deleteNote(noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: knowledgeKeys.vaultNotes });
      // The tag list is derived from the notes, so removing the last note carrying a tag retires
      // that tag. Leaving it cached would keep offering a filter choice that can no longer match.
      queryClient.invalidateQueries({ queryKey: knowledgeKeys.vaultTags });
    },
  });
}

/** Wipe the server's copy of the whole vault. Resolves to the number of notes removed. */
export function useDeleteAllVaultNotes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => vaultApi.deleteAllNotes(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: knowledgeKeys.vaultNotes });
      queryClient.invalidateQueries({ queryKey: knowledgeKeys.vaultTags });
    },
  });
}
