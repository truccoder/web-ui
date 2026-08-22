import { existsSync, statSync } from 'node:fs';
import { test as setup, expect } from '@playwright/test';
import { DEMO_USER, USER_STATE, STATE_TTL_MS } from './accounts';

/**
 * Signs in once and saves the session to disk, REUSING IT ACROSS RUNS while it is still fresh.
 *
 * ── The reuse is not an optimisation. `POST /v1/api/auth/login` IS RATE LIMITED. ───────────────
 *
 * Measured on 22/08, the hard way: after a handful of suite runs in quick succession — each one
 * re-running this setup — the endpoint started answering **429**, and every test in the run then
 * failed on a login that never completed. The failure is maximally confusing, because the browser
 * shows an empty auth card and nothing anywhere says "rate limit"; the frontend renders the
 * error, but the setup times out waiting for a redirect first.
 *
 * So a suite that logs in on every invocation is a suite that stops working exactly when you are
 * iterating on it fastest. Skipping while a saved session is young keeps a normal working session
 * to one login. Note this contradicts the note in `api/moderation.ts` that the backend has no rate
 * limiting: that was measured on `POST /posts`, and auth is evidently a different story.
 *
 * `STATE_TTL_MS` IS ABOUT THE REFRESH TOKEN, NOT THE ACCESS TOKEN. The access token lives 900
 * seconds, which would be a useless TTL — but the axios interceptor silently exchanges the
 * refresh token when it expires, so a saved state stays usable far longer than the token inside
 * it. The TTL is a coarse "this is probably still good"; if it is wrong, the tests fail on a 401
 * and deleting `e2e/.auth/` fixes it. Nothing here tries to be clever about validating it, since
 * probing the API to find out costs the request the caching is meant to save.
 *
 * ── It signs in through the FORM, not by posting to `/auth/login` and injecting tokens. ───────
 *
 * The API call is the easy version and it would skip the part most likely to break: a session
 * here is not one artefact but four — the token pair in localStorage (where the axios request
 * interceptor reads it synchronously), the same pair in Redux, the `session` cookie the edge
 * middleware routes on, and the `role` cookie written afterwards by the profile probe. Forging
 * them by hand means the suite stops testing `useEstablishSession` and starts re-implementing it,
 * so the day the shape changes every test still passes against a session the app can no longer
 * make.
 *
 * WAITING ON `/newsfeed` IS THE ASSERTION, not a convenience. `usePostAuthRedirect` sends an admin
 * to `/admin/moderation` and everyone else to `/newsfeed`, and it learns which by probing
 * `GET /profile/me` — there is no role in the JWT. So arriving here proves the token was accepted,
 * the profile was fetched with it, and the role was resolved.
 */
setup('sign in as the demo user', async ({ page }) => {
  if (existsSync(USER_STATE) && Date.now() - statSync(USER_STATE).mtimeMs < STATE_TTL_MS) {
    setup.skip(true, 'Reusing the saved session — see the rate-limit note in auth.setup.ts');
    return;
  }

  await page.goto('/login');

  await page.getByLabel('Email').fill(DEMO_USER.email);
  await page.getByLabel('Mật khẩu').fill(DEMO_USER.password);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();

  // A 429 renders as an alert on the form rather than a redirect, so name it: without this the
  // only symptom is a navigation timeout that says nothing about why.
  await expect(page.getByRole('alert')).toHaveCount(0);

  await page.waitForURL('**/newsfeed', { timeout: 30_000 });

  // The rail only renders once the shell has a profile, so this is the cheapest proof that the
  // session is usable and not merely present.
  await expect(page.getByRole('navigation', { name: 'Điều hướng chính' })).toBeVisible();

  await page.context().storageState({ path: USER_STATE });
});
