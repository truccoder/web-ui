/**
 * The seeded accounts the suite signs in as, and where their sessions are cached.
 *
 * THESE ARE SEED CREDENTIALS FOR A LOCAL DEV DATABASE, not secrets. They are the same pair
 * `docs/demo-script.md` prints in its own table, they only exist in a `docker-compose` stack on
 * someone's laptop, and the password is `12345678` because the seeder chose it. Reading them from
 * the environment would be security theatre that costs every new contributor a setup step.
 *
 * If you point this suite at anything that is not a local seeded database, stop and read
 * `playwright.config.ts` first — the read-only rule there exists for a reason.
 */
export const DEMO_USER = {
  email: 'backend_truc_anh@seed.test',
  password: '12345678',
} as const;

/**
 * The moderator account, for the admin surfaces of Act 4. Verified working on 22/08 — the seven
 * `admin.spec.ts` tests sign in with this and pass.
 *
 * THE PASSWORD IS NOT THE ONE `docs/demo-script.md` USED TO PRINT. The script's table said
 * `admin_one@seed.test` / `12345678`, which answers 401; `12345678a` does too. The working
 * password is below, and the doc is corrected to match. A presenter trusting the old table would
 * have lost Act 4 — the whole of which is admin work — to a login screen, so the value being right
 * here is not only about the tests.
 *
 * It is a seed credential for a local dev database, not a secret, so it lives in source like
 * `DEMO_USER` above. If you point this suite at anything that is not a local seeded database, stop
 * and read the read-only rule in `playwright.config.ts` first.
 */
export const ADMIN_USER = {
  email: 'admin_one@seed.test',
  password: 'SocialApp@Admin2026',
} as const;

export const USER_STATE = 'e2e/.auth/user.json';
export const ADMIN_STATE = 'e2e/.auth/admin.json';

/**
 * How long a saved session is reused before the setup signs in again.
 *
 * THE NUMBER IS BOUNDED BY THE LOGIN RATE LIMIT ON ONE SIDE AND THE REFRESH TOKEN ON THE OTHER.
 * `POST /auth/login` starts answering 429 after a few attempts in quick succession (measured
 * 22/08), so this must be long enough that a working session costs one login. The access token
 * lives 900 seconds, but the axios interceptor exchanges the refresh token on expiry, so the
 * saved state outlives the token inside it — an hour is comfortably inside that and short enough
 * that a stale session is not left lying around between working days.
 *
 * If the tests start failing on 401s, delete `e2e/.auth/` and let the setup run again.
 */
export const STATE_TTL_MS = 60 * 60 * 1000;
