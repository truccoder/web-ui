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
 * THE ADMIN ACCOUNT IS NOT HERE, AND ITS ABSENCE IS A FINDING.
 *
 * `docs/demo-script.md` lists `admin_one@seed.test` / `12345678` as the moderator login. Against
 * the database this suite was written on, that pair answers **401 Invalid credentials** — checked
 * 22/08 straight against `POST /v1/api/auth/login`, so it is not a frontend problem.
 *
 * Two things follow. The admin specs cannot be written until someone supplies a working pair —
 * add it here and they can be. And more urgently: the demo script's Act 4 is entirely admin work
 * (the moderation queue, the appeal, the skill approval that closes the loop), so if that
 * credential does not work on the day, the strongest three minutes of the presentation do not
 * happen. Worth checking before the room, not in it.
 */
export const USER_STATE = 'e2e/.auth/user.json';

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
