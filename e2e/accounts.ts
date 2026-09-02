/**
 * The seeded accounts the suite signs in as, and where their sessions are cached.
 *
 * THESE ARE SEED CREDENTIALS FOR A LOCAL DEV DATABASE, not secrets. They only exist in a
 * `docker-compose` stack on someone's laptop, and the password is what
 * `DATN-backend/scripts/seed/generate_seed.py` chose (`PASSWORD_USER`). Reading them from the
 * environment would be security theatre that costs every new contributor a setup step.
 *
 * If you point this suite at anything that is not a local seeded database, stop and read
 * `playwright.config.ts` first — the read-only rule there exists for a reason.
 */
export const DEMO_USER = {
  email: 'tranhaithinh@elitenexus.test',
  password: '12qwaszx',
} as const;

/**
 * The moderator account, for the admin surfaces of Act 4.
 *
 * THE WHOLE ACCOUNT SET CHANGED WHEN THE DATABASE WAS RE-SEEDED, and the old values did not fail
 * loudly — they answered **401**, which this suite renders as a login that never completes and a
 * navigation timeout that says nothing about why. Measured 02/09: `backend_truc_anh@seed.test`
 * and `admin_one@seed.test` no longer exist at all; the seeded set is 501 accounts on
 * `@elitenexus.test`, of which exactly two carry `role = 'ADMIN'`.
 *
 * The passwords are the generator's own two constants — `PASSWORD_USER` (`12qwaszx`) and
 * `PASSWORD_ADMIN` (`1234qwer`) in `DATN-backend/scripts/seed/generate_seed.py`, where they are
 * written as bcrypt hashes with the plaintext in a trailing comment. Read them from there rather
 * than from any doc if this drifts again.
 *
 * They are seed credentials for a local dev database, not secrets, so they live in source. If you
 * point this suite at anything that is not a local seeded database, stop and read the read-only
 * rule in `playwright.config.ts` first.
 */
export const ADMIN_USER = {
  email: 'lygiahoa@elitenexus.test',
  password: '1234qwer',
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
