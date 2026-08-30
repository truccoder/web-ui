import api from '@/core/api/axios';
import type {
  UpdateVaultContextSettingsInput,
  VaultContextSettings,
  VaultNoteDetail,
  VaultNotePage,
} from '../types/knowledge';

/**
 * `VaultNoteController` (`/v1/api/knowledge/vault`) — the owner's own view of what their vault has
 * pushed up.
 *
 * **THIS IS THE SESSION-AUTHENTICATED HALF OF THE VAULT, AND THAT DISTINCTION IS THE WHOLE POINT.**
 * `/knowledge/sync/pull|push` sit on `permitAll` in `SecurityConfig` and authenticate with a
 * personal access token, because the caller is the Obsidian plugin. These endpoints are the
 * opposite: they are reached from a page the user is already signed in to, so they use the session
 * JWT like every other function in this feature. The path is `/knowledge/vault/**` rather than
 * anything under `/knowledge/sync/**` precisely so no `permitAll` matcher can ever widen to cover
 * reading and deleting somebody's personal notes.
 *
 * WHY IT EXISTS: the push endpoint stores up to 500 notes per request, and until this controller
 * there was no endpoint anywhere that let the person those notes belong to see them or remove them.
 * That is not a missing convenience — it is personal notes with no delete button.
 */
export const vaultApi = {
  /**
   * GET /v1/api/knowledge/vault/notes — one page of the caller's notes, newest first.
   *
   * **NO `content` ON THIS PAYLOAD.** The backend returns `VaultNoteSummaryDto`, which carries
   * filename, tags and links but not the body — a vault runs to hundreds of notes, and shipping
   * every body to render a list of filenames would send a whole personal knowledge base over the
   * wire. `getNote` is what fetches a body, one note at a time.
   *
   * Cursor pagination, same rule as the bookstore: `nextCursor` is the id of the last row on the
   * page and is null when nothing follows. `limit` is capped at 50 server-side.
   */
  listNotes: (cursor?: number, limit?: number) =>
    api
      .get<VaultNotePage>('/v1/api/knowledge/vault/notes', { params: { cursor, limit } })
      .then((r) => r.data),

  /** GET /v1/api/knowledge/vault/notes/{noteId} — one note, body included. */
  getNote: (noteId: number) =>
    api.get<VaultNoteDetail>(`/v1/api/knowledge/vault/notes/${noteId}`).then((r) => r.data),

  /**
   * DELETE /v1/api/knowledge/vault/notes/{noteId} — remove the server's copy of one note.
   *
   * A note belonging to someone else is a **404**, not a 403: ids come from a sequence, so an id
   * from one vault is a valid-looking id in another, and a 403 would confirm that a given id
   * exists. Same choice as `revokeToken`.
   *
   * IT DOES NOT TOUCH THE USER'S OWN VAULT, and it does not stop the plugin pushing the same note
   * again on its next sync. The UI has to say so, or "delete" reads as a promise this cannot keep.
   */
  deleteNote: (noteId: number) =>
    api.delete<void>(`/v1/api/knowledge/vault/notes/${noteId}`).then(() => undefined),

  /**
   * DELETE /v1/api/knowledge/vault/notes — wipe the server's copy of the whole vault.
   *
   * Returns the number of rows removed rather than 204, because "431 notes removed" is the only
   * confirmation available for an action whose visible effect is that a list becomes empty.
   */
  deleteAllNotes: () => api.delete<number>('/v1/api/knowledge/vault/notes').then((r) => r.data),

  /**
   * GET /v1/api/knowledge/vault/tags — every distinct tag across the caller's synced notes.
   *
   * READ FROM THE NOTES, NOT FROM THE SAVED FILTER. The point of the list is to let somebody pick
   * from what they actually have: a free-text tag box fails silently — a filter naming a tag that
   * exists nowhere matches nothing, and on the *exclude* side that failure is invisible, because
   * "no note was excluded" looks exactly like "the rule worked and nothing matched".
   */
  getTags: () => api.get<string[]>('/v1/api/knowledge/vault/tags').then((r) => r.data),

  /**
   * GET /v1/api/knowledge/vault/settings — which notes may be used as AI context.
   *
   * A user who has never configured anything gets two empty lists, not a 404: "no filter" is a
   * real answer and the default one, so the screen has an ordinary state to render.
   */
  getSettings: () =>
    api.get<VaultContextSettings>('/v1/api/knowledge/vault/settings').then((r) => r.data),

  /**
   * PUT /v1/api/knowledge/vault/settings — replace the filter.
   *
   * A FULL REPLACE, and both lists must be sent. The server reads a missing list as empty rather
   * than "leave it alone", so a client that patches one side would silently clear the other — on a
   * privacy control that means personal notes quietly returning to the prompt with nothing on
   * screen to show it happened.
   */
  updateSettings: (input: UpdateVaultContextSettingsInput) =>
    api.put<VaultContextSettings>('/v1/api/knowledge/vault/settings', input).then((r) => r.data),
};
