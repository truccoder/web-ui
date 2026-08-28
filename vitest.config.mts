import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * UNIT TESTS — pure logic only, and that boundary is the point of this file existing separately
 * from `playwright.config.ts`.
 *
 * THE E2E SUITE CANNOT COVER THIS, BY ITS OWN DESIGN. `playwright.config.ts` explains at length
 * why it is read-only: it runs against the DEMO database that `docs/demo-script.md` quotes to the
 * number, and a test that reviews a post can ban its author. That rule is right and does not
 * change here. But it leaves a whole class of code with nothing checking it — an allow-list of
 * regexes, a currency splitter, an error-shape reader — none of which needs a database, a browser
 * or a session to be wrong.
 *
 * So these two suites do not overlap and neither replaces the other: Playwright proves the app
 * and the backend AGREE, this proves a function does what it says. Nothing here touches the
 * network or the database, so no test in this project can rewrite the demo.
 *
 * `environment: 'node'`, NOT jsdom. Every module under test is pure — no component, no hook, no
 * DOM. Adding jsdom would buy a slower start and an implicit invitation to test React here, and
 * component tests belong to a decision nobody has made yet.
 *
 * TESTS SIT BESIDE THEIR SOURCE (`format.test.ts` next to `format.ts`) rather than in a top-level
 * `__tests__/`. This repo keeps everything a slice owns inside that slice — see the four-home
 * rule in `src/shared/README.md` — and a central test folder is the same cross-domain bucket that
 * `src/lib/` was dismantled for.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      // The generated OpenAPI types and the barrels are declarations, not logic.
      exclude: ['src/core/api/schema.gen.ts', '**/index.ts', '**/*.d.ts'],
    },
  },
  resolve: {
    // Mirrors the `paths` block in `tsconfig.json`. Longest prefix first — `@/*` would otherwise
    // swallow the three specific ones.
    alias: [
      { find: '@/core', replacement: fileURLToPath(new URL('./src/core', import.meta.url)) },
      { find: '@/shared', replacement: fileURLToPath(new URL('./src/shared', import.meta.url)) },
      { find: '@/features', replacement: fileURLToPath(new URL('./src/features', import.meta.url)) },
      { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
    ],
  },
});
