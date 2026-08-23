import { existsSync, statSync } from 'node:fs';
import { test as setup, expect, type Page } from '@playwright/test';
import { ADMIN_STATE, ADMIN_USER, DEMO_USER, STATE_TTL_MS, USER_STATE } from './accounts';

/**
 * Signs in once per role and saves each session to disk, REUSING IT ACROSS RUNS while it is
 * still fresh.
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
 * to one login per role. `STATE_TTL_MS` carries the reasoning for the window.
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
 * WAITING ON THE ROLE'S HOME ROUTE IS THE ASSERTION, not a convenience. `usePostAuthRedirect`
 * sends an admin to `/admin/moderation` and everyone else to `/newsfeed`, and it learns which by
 * probing `GET /profile/me` — there is no role in the JWT. So arriving at the RIGHT one of those
 * two proves three things at once: the token was accepted, the profile was fetched with it, and
 * the role resolved to what this account is supposed to be. An admin landing on `/newsfeed` would
 * fail here, which is exactly the failure worth catching — it means the account is not actually
 * an admin.
 */
async function signIn(
  page: Page,
  account: { email: string; password: string },
  landingUrl: string,
  landmarkName: string,
  statePath: string
) {
  await page.goto('/login');

  await page.getByLabel('Email').fill(account.email);
  await page.getByLabel('Mật khẩu').fill(account.password);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();

  // A 429 (or a wrong password) renders as an alert INSIDE the form rather than a redirect, so
  // name it: without this the only symptom is a navigation timeout that says nothing about why.
  //
  // SCOPED TO THE FORM ON PURPOSE. A bare `getByRole('alert')` also matches Next's route
  // announcer — a top-level `aria-live` region that fills with the page title after a successful
  // navigation ("Bảng tin · Elite Nexus") — so the unscoped check went red on the very login it
  // was meant to wave through. The login error `<p role="alert">` lives inside `<form>`; the
  // announcer does not. Measured 22/08, after it failed a working session.
  await expect(page.locator('form').getByRole('alert')).toHaveCount(0);

  await page.waitForURL(landingUrl, { timeout: 30_000 });

  // The shell only renders its nav once it has a profile, so this is the cheapest proof that the
  // session is usable and not merely present. The two shells name their nav differently, which is
  // itself a check that the right shell rendered.
  await expect(page.getByRole('navigation', { name: landmarkName })).toBeVisible();

  await page.context().storageState({ path: statePath });
}

/** True while the saved state at `path` is younger than the reuse window. */
function fresh(path: string): boolean {
  return existsSync(path) && Date.now() - statSync(path).mtimeMs < STATE_TTL_MS;
}

setup('sign in as the demo user', async ({ page }) => {
  if (fresh(USER_STATE)) {
    setup.skip(true, 'Reusing the saved user session — see the rate-limit note in auth.setup.ts');
    return;
  }
  await signIn(page, DEMO_USER, '**/newsfeed', 'Điều hướng chính', USER_STATE);
});

setup('sign in as the admin', async ({ page }) => {
  if (fresh(ADMIN_STATE)) {
    setup.skip(true, 'Reusing the saved admin session — see the rate-limit note in auth.setup.ts');
    return;
  }
  // The admin shell's nav is labelled by its own key, not `Điều hướng chính` — landing here in
  // the (admin) shell rather than (main) is half the point of the assertion.
  await signIn(page, ADMIN_USER, '**/admin/moderation', 'Quản trị kiểm duyệt', ADMIN_STATE);
});
