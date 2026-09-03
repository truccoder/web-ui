import { test, expect } from '@playwright/test';
import { settle } from './settle';

/**
 * VISUAL REGRESSION — `docs/ui-audit-plan.md` P4.1.
 *
 * ── What is screenshotted, and what is deliberately not ──────────────────────────────────────
 *
 * A screenshot test is only worth its baseline if a diff MEANS something. The screens below were
 * chosen by one filter: **does anything on this page change between two runs for a reason that is
 * not a code change?** Everything that failed that filter was left out rather than papered over
 * with a pixel tolerance, because a tolerance wide enough to swallow a re-ordered feed is also
 * wide enough to swallow a shifted card.
 *
 * OUT, and why, so the next person does not "fix" the omission:
 *   · `/newsfeed` — crawled items arrive continuously and carry relative times ("6 ngày trước").
 *   · `/notifications` — same, plus an unread count that any other session can change.
 *   · `/friends/all`, `/projects` — server does not promise an order (`playwright.config.ts`
 *     says so already, which is why the suite runs serial).
 *   · `/posts/{id}`, `/u/{name}`, `/books/{id}` — the path itself is discovered at run time
 *     (`discover.ts`), so the baseline would be of whatever happened to be first.
 *
 * IN: the settings hub, whose three screens are the C002 finding rendered — half the hub puts
 * content on a card and half does not — plus `/profile`, `/chats` and the two terminal screens.
 * All of them are stable between runs on the demo database.
 *
 * ── The widths ──────────────────────────────────────────────────────────────────────────────
 * 375 · 1024 · 1440: phone, rail-without-ledger, and the width the product is designed at. The
 * two skipped steps (768, 1280) are covered by `layout.spec.ts`, which asserts the numbers that
 * change there; a picture of them would add baselines without adding evidence.
 *
 * ── Viewport, not full page ─────────────────────────────────────────────────────────────────
 * `fullPage: false`. A full-page shot of a long screen is mostly a picture of content, and it
 * changes height whenever the content does — which turns every diff into a whole-image diff and
 * tells you nothing about where the change was.
 *
 * ── First run writes baselines ──────────────────────────────────────────────────────────────
 * `npx playwright test visual --update-snapshots` after a deliberate visual change. Review the
 * PNGs in the diff like any other reviewable artefact — an unreviewed baseline is a rubber stamp.
 */

const WIDTHS = [375, 1024, 1440] as const;

/** `<route, snapshot name>` — the name carries the route so a failure names the screen. */
const SCREENS: ReadonlyArray<readonly [string, string]> = [
  // The C002 pair: same strip above, different surface below. Side by side in the baseline.
  ['/settings/notifications', 'settings-notifications'],
  ['/settings/tokens', 'settings-tokens'],
  ['/settings/vault', 'settings-vault'],
  // Archetype H — hero geometry, the `-mt-16` overlap, the tab strip.
  ['/profile', 'profile'],
  // Archetype E — the only full-bleed tenant, and the one whose three columns can only be
  // wrong all at once.
  ['/chats', 'chats'],
  // Archetype I — a terminal screen nobody looks at, which is why it drifts.
  ['/offline', 'offline'],
];

test.describe('visual regression', () => {
  for (const [route, name] of SCREENS) {
    for (const width of WIDTHS) {
      test(`${name} @ ${width}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(route);
        await page.locator('main, [role="main"], body').first().waitFor();

        /**
         * Wait for the network to settle AND for fonts to be ready. Geist is loaded by
         * `next/font`, and a shot taken mid-swap captures the fallback metrics — which is a diff
         * every single run, in a file whose whole job is that a diff means something.
         */
        await settle(page);

        await expect(page).toHaveScreenshot(`${name}-${width}.png`, {
          fullPage: false,
          animations: 'disabled',
          /**
           * TIGHTENED FROM 0.01 AFTER IT SWALLOWED A REAL CHANGE. P3 added a "Thử lại" button to
           * `/offline`; the baseline flagged it at 375 and passed it at 1024 and 1440, because a
           * ~120×36 control is 0.33% of a 1440×900 viewport and the threshold was 1%. A tolerance
           * that hides a whole new button is not a tolerance, it is a blind spot that grows with
           * the screen.
           *
           * 0.002 still absorbs the sub-pixel text antialiasing that differs between machines —
           * measured stable across repeated runs — while a component-sized change on the largest
           * viewport is ~1.6× over it.
           */
          maxDiffPixelRatio: 0.002,
        });
      });
    }
  }
});
