import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests against the REAL stack — this app on top of the real Spring backend, the real
 * Postgres, the real Neo4j. There is no mocking layer anywhere in `e2e/`, and adding one would
 * defeat the point: everything worth asserting here is a claim about the two halves agreeing.
 * A unit test can prove `normalizeQuiz` sorts a list; only this can prove that searching
 * `Nguyễn` and `nguyen` come back the same, which is the sort of thing `docs/demo-script.md`
 * promises out loud.
 *
 * ────────────────────────────────────────────────────────────────────────────────────────────
 * THE SUITE IS READ-ONLY, AND THAT IS A HARD RULE RATHER THAN A PREFERENCE.
 *
 * The database these tests run against is the DEMO database. `docs/demo-script.md` quotes its
 * contents to the number — "2 bài chờ kiểm duyệt, 4 bài chờ xem xét", "48 yêu cầu chờ", "1 khiếu
 * nại chờ xử lý", Elite Score 129 — and the script's beats depend on those numbers still being
 * true when the presenter walks into the room.
 *
 * So a test that posts, approves a skill, rejects a post or decides an appeal would not merely be
 * untidy: it would quietly rewrite the demo. Reviewing a post can BAN ITS AUTHOR (two violations
 * is a seven-day ban that blocks login), and approving a skill moves someone's Elite Score across
 * a level threshold. A suite anyone can run should not be able to do either by accident.
 *
 * Everything here therefore only reads. Where a flow genuinely needs a write to be worth testing —
 * composing a post, submitting a verification, buying a book — the test is NOT written rather
 * than written carefully, because "carefully" is not a property a future edit preserves. Those
 * belong in a separate project against a disposable database, and the seeder for it is `B1` in
 * `docs/backend-plan.md`, still unbuilt.
 *
 * ────────────────────────────────────────────────────────────────────────────────────────────
 * WHAT IT NEEDS RUNNING. The backend on :8080 with the seeded data — `docker ps` should show
 * postgres, neo4j, redis and minio, and `curl localhost:8080/v3/api-docs` should answer 200. The
 * web server is started by `webServer` below from the PRODUCTION build, not `next dev`: the demo
 * script's opening paragraph records `next dev` restarting four times in two days on memory and
 * spending fifteen seconds recompiling a route, which in a test run reads as a flaky timeout.
 */
export default defineConfig({
  testDir: './e2e',

  /**
   * Serial, not parallel. The tests share one signed-in account, and while none of them writes,
   * several read lists whose ordering the backend does not promise — running them against one
   * another's page loads buys nothing on a suite this size and costs reproducibility.
   */
  fullyParallel: false,
  workers: 1,

  /** A failure here means the app and the backend disagree. That is worth stopping on in CI. */
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,

  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],

  use: {
    baseURL: 'http://localhost:3000',
    /**
     * 1440 wide because that is the width the product is designed at and the width the demo is
     * given at — `docs/demo-script.md` says not to go under 1360, where the ledger flank drops
     * out at the `xl` step. A default 1280 viewport would silently test a different layout from
     * the one anyone sees.
     */
    viewport: { width: 1440, height: 900 },
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    /**
     * Signs in once per role and writes each session to `e2e/.auth/`. Playwright's `storageState`
     * captures cookies AND localStorage, which is exactly the pair a session here consists of:
     * `session`/`role` cookies for the edge middleware, and the token pair in localStorage where
     * the axios interceptor reads it. Capturing only one would produce a browser the middleware
     * lets through and the API rejects.
     *
     * TWO SETUP PROJECTS, ONE PER ROLE, AND THE SPLIT IS LOAD-BEARING. A dependent project is
     * skipped when its dependency project has ANY failing test — so a single `setup` project
     * holding both logins would take the entire user suite down with it the day the admin
     * credential is wrong (which is exactly the state `accounts.ts` warns about). Splitting them
     * means a broken admin password fails only `chromium-admin`, and the 30-odd user tests still
     * run and still mean something.
     */
    { name: 'setup-user', testMatch: /auth\.setup\.ts/, grep: /demo user/ },
    { name: 'setup-admin', testMatch: /auth\.setup\.ts/, grep: /as the admin/ },

    /**
     * The signed-in USER. Everything except the admin surfaces, which need the other shell — so
     * `admin.spec.ts` is excluded here rather than being run under a user session it would only
     * ever get bounced out of by the middleware.
     */
    {
      name: 'chromium',
      testIgnore: /admin\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], storageState: 'e2e/.auth/user.json' },
      dependencies: ['setup-user'],
    },

    /**
     * The ADMIN, for `/admin/**` only. A SEPARATE PROJECT RATHER THAN A SECOND `storageState` ON
     * THE SAME ONE, because the two sessions cannot share a browser: `middleware.ts` redirects an
     * `ADMIN` session away from every path outside `/admin/**` AND a `USER` session away from
     * every path inside it, so a test that switched roles mid-file would spend its time being
     * redirected. One project per role keeps each session on the routes it is allowed to see.
     */
    {
      name: 'chromium-admin',
      testMatch: /admin\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], storageState: 'e2e/.auth/admin.json' },
      dependencies: ['setup-admin'],
    },
  ],

  webServer: {
    // `yarn build` is NOT run here on purpose: rebuilding on every invocation turns a 20-second
    // suite into a two-minute one, and the build is a thing you notice failing on its own.
    command: 'yarn start',
    url: 'http://localhost:3000/login',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
