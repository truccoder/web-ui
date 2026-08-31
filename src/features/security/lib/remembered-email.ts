/**
 * ---------------------------------------------------------------------------------------------
 * THE EMAIL THE SIGN-IN SCREEN WOULD OTHERWISE MAKE THE READER TYPE A SECOND TIME.
 * ---------------------------------------------------------------------------------------------
 *
 * Registration does not establish a session: `POST /auth/register` returns void and sends a
 * verification mail, so the reader leaves the app, opens the mail, lands on `/verify-email?token=`
 * and is then handed a "continue to sign in" button. The screen that button leads to is a blank
 * login form — the address they typed one minute earlier is gone.
 *
 * Nothing on the server can fill it back in. `POST /auth/verify-email` answers `void` (see
 * `recoveryApi.verifyEmail`); the token is the only thing on that URL, and it is opaque. So the
 * browser has to be the one that remembers.
 *
 * WHY `localStorage` AND NOT THE STORE OR `sessionStorage`. Both of the others are gone by the
 * time it is needed. Redux is wiped on reload and the mail client causes a full navigation;
 * `sessionStorage` is per-tab and a mail link routinely opens a NEW tab, which starts empty. Only
 * `localStorage` survives both.
 *
 * IT IS A CONVENIENCE, NEVER AN IDENTITY. Nothing here authenticates anyone — the value is dropped
 * straight into a text field the reader can edit, and the password is still required. A forged or
 * hand-edited entry costs a wrong default in one input.
 *
 * IT EXPIRES, because a login form on a shared machine should not still be naming someone a week
 * later. The window is deliberately short and the failure is silent: past it, the field is simply
 * empty, which is exactly what this screen did before this module existed.
 */

const STORAGE_KEY = 'nx.security.sign-in-email';

/**
 * How long a remembered address is worth offering.
 *
 * Sized to the job — verify the mail that just arrived — not to the verification token's own life,
 * which this side cannot see. Verifying later than this still works; the field just starts empty.
 */
const REMEMBERED_EMAIL_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * `localStorage` is absent during server render and THROWS rather than returning null in a browser
 * configured to block site data, so both are handled here once instead of at every call site.
 */
function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/**
 * Read the stored address back, dropping anything that is not one.
 *
 * EXPORTED FOR ITS TEST, AND BECAUSE IT IS THE PART THAT MEETS UNTRUSTED INPUT. `localStorage` is
 * writable by anything on this origin and outlives any one version of this code, so a parse cannot
 * assume its own writes are what it reads back. The `@` check is not validation — the login form
 * runs the real one through zod — it only keeps arbitrary text out of an `type="email"` field.
 */
export function parseRememberedEmail(raw: string | null, now = Date.now()): string | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed == null || typeof parsed !== 'object') return null;
    const { email, savedAt } = parsed as Record<string, unknown>;
    if (typeof email !== 'string' || typeof savedAt !== 'number') return null;
    if (!email.includes('@') || email.length > 254) return null;
    if (now - savedAt >= REMEMBERED_EMAIL_TTL_MS) return null;
    return email;
  } catch {
    return null;
  }
}

/**
 * Remember the address someone just signed up with, so the sign-in screen they are sent back to
 * after verifying already names them.
 */
export function rememberSignInEmail(email: string) {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(STORAGE_KEY, JSON.stringify({ email, savedAt: Date.now() }));
  } catch {
    // A blocked store or a full quota costs the prefill, nothing else. The reader types the
    // address as they did before; there is no failure worth reporting to them.
  }
}

/** The remembered address, or `null` when there is none, it is stale, or it is not readable. */
export function readRememberedSignInEmail(): string | null {
  return parseRememberedEmail(storage()?.getItem(STORAGE_KEY) ?? null);
}

/** Drop it — the handoff is finished, or it belonged to someone who is now signed in. */
export function forgetSignInEmail() {
  try {
    storage()?.removeItem(STORAGE_KEY);
  } catch {
    // Same as the write: an unusable store is not the reader's problem.
  }
}
