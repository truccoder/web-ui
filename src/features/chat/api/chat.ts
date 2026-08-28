import api from '@/core/api/axios';
import type { ChatToken, CreateGroupChatInput, GroupChatHandle } from '../types/chat';

/**
 * ChatController (`com.socialapp.chat`) — 3 endpoints, 3 functions. Bare responses, no wrapper.
 */
export const chatApi = {
  /**
   * GET /v1/api/chat/token — a Stream Chat credential for the signed-in user.
   *
   * ALSO SYNCS THE USER'S PROFILE TO STREAM AS A SIDE EFFECT. `issueToken` calls
   * `upsertUser` (name + avatar) on the way past, best-effort: if that push fails the token is
   * still returned and the chat UI degrades to numeric ids rather than failing to open. So
   * calling this is what makes a person's name appear in Stream at all — there is no separate
   * "register me" step for the client to make.
   *
   * ANSWERS 503, NOT 500, WHEN STREAM IS NOT CONFIGURED (`MissingConfigurationException` →
   * `stream.chat.api-key`/`api-secret` unset). That is an operator problem, not a transient one,
   * and the state layer maps it to its own status so the UI does not offer a pointless retry.
   *
   * The token is signed HS256 with `exp` 24h out (`expiresAt` says exactly when) — both were
   * backend fixes landed for this checkpoint; see `findings/chat.md` R2/R4.
   */
  getToken: () => api.get<ChatToken>('/v1/api/chat/token').then((r) => r.data),

  /**
   * POST /v1/api/chat/participants/{userId} — introduce a pair to Stream. 204.
   *
   * THIS IS WHY CHAT ONLY EVER WORKED BETWEEN FRIENDS. `GET /token` upserts the caller *and their
   * friends* into Stream, and Stream refuses to create a channel containing a user it has never
   * seen — so opening a conversation with anyone outside that set failed at `channel.watch()`,
   * with an error about the member rather than about the reason.
   *
   * IDEMPOTENT AND SAFE FOR FRIENDS TOO, which the backend states explicitly, and that is what
   * lets the caller stop caring: nothing on this side has to work out whether the two are already
   * friends before opening a conversation. Call it first, always.
   */
  ensureParticipants: (userId: number) =>
    api.post<void>(`/v1/api/chat/participants/${userId}`).then((r) => r.data),

  /**
   * POST /v1/api/chat/groups — open a named group conversation. **201** with the channel handle.
   *
   * THE ONLY CHANNEL THIS BACKEND CREATES. Everything else about chat happens against Stream from
   * the browser, and a direct message still does — `ensureParticipants` introduces the pair and
   * `channel.watch()` creates it. A group cannot work that way, for two reasons no amount of
   * client code fixes: `created_by_id` is whatever the client sends, so the browser would be
   * deciding who owns the channel; and the only blocks a client can check are the ones involving
   * itself, so inviting two people who have blocked EACH OTHER would succeed and put them in one
   * room, which is the single outcome blocking exists to prevent.
   *
   * IT ALSO REPLACES A LOOP. Without it the shape is one `POST /participants/{id}` per member and
   * then a client-side create — n round trips for one action, and still wrong on both counts above.
   *
   * `ensureParticipants` IS NOT NEEDED FIRST AND MUST NOT BE CALLED. This endpoint upserts every
   * member into Stream itself, in one batch, before it creates the channel.
   *
   * TWO WAYS A BAD MEMBER LIST COMES BACK, and they are different statuses:
   *
   *   - **422** — the list breaks bean validation: empty, more than 99, a non-positive id, or a
   *     name over 100 characters. `details` carries a readable per-field message.
   *   - **400** — the list only turns out to be too short AFTER the backend removes duplicates and
   *     the caller's own id. `@Size(min = 2)` cannot see that `[7, 7]` or `[7, me]` is one person,
   *     so this is the branch a member picker that allows the same person twice lands on.
   *
   * A 404 names the ids with no user behind them; a 400 also carries the "a block stands between
   * two members" case, which is a `ValidationException` like the short-list one and cannot be told
   * apart from it by status alone — the message is the only signal, so surface it rather than
   * writing copy for a guess.
   */
  createGroup: (payload: CreateGroupChatInput) =>
    api.post<GroupChatHandle>('/v1/api/chat/groups', payload).then((r) => r.data),
};
