import api from '@/core/api/axios';
import type { ChatToken } from '../types/chat';

/**
 * ChatController (`com.socialapp.chat`) — 1 endpoint, 1 function. Bare response, no wrapper.
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
};
