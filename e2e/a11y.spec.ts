import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { settle } from './settle';

/**
 * ACCESSIBILITY — `docs/ui-audit-plan.md` P4.2.
 *
 * ── The threshold is the whole design of this file ──────────────────────────────────────────
 *
 * axe reports four impact levels. This suite fails on **serious** and **critical** only, and the
 * plan says why in one line: *"đặt ngưỡng ở mức serious + critical để không nhận cả nghìn cảnh
 * báo rồi tắt đi"*. A gate that reports everything is a gate somebody switches off in a week,
 * and a switched-off gate is worse than none because it looks like coverage.
 *
 * `minor` and `moderate` findings are still visible — they are printed by the reporter on a
 * failure and can be read any time by dropping the filter locally. They are simply not allowed
 * to break a build.
 *
 * ── Which rules are disabled, and the honest reason for each ─────────────────────────────────
 *
 * `color-contrast` is DISABLED here and that is a real gap, stated rather than hidden. It is not
 * disabled because the palette fails — §3.8 of the report measures the auth panel at 16.68:1 and
 * 6.93:1, and the dark surfaces at their token values. It is disabled because axe computes
 * contrast from the composited pixel, and this product paints `--nx-tint` (an alpha) over three
 * different planes; axe resolves those to a background it cannot see through and reports a
 * finding on every tinted chip on the screen. Contrast is checked by measurement in the audit
 * instead. Re-enable the day the tint stops being an alpha.
 *
 * ── Known failure, on purpose ───────────────────────────────────────────────────────────────
 *
 * F001 — `<button>` inside `<a>`, 21 sites across the app including `shared/api-error-notice`.
 * axe reports it as `nested-interactive`, impact **serious**. The rule is therefore listed in
 * `KNOWN` below rather than disabled: the count is asserted, so the day someone adds a 22nd the
 * suite goes red, and the day P2 fixes them the assertion goes red too and asks to be deleted.
 *
 * ── Read-only ───────────────────────────────────────────────────────────────────────────────
 * axe reads the rendered tree. Nothing here writes.
 */

/** The twelve screens, one or two per archetype. Fixed paths only — see `visual.spec.ts`. */
const SCREENS = [
  '/newsfeed',
  '/newsfeed?tab=posts',
  '/notifications',
  '/friends/all',
  '/library',
  '/projects',
  '/knowledge',
  '/search?q=nguyen',
  '/settings/notifications',
  '/settings/tokens',
  '/profile',
  '/chats',
] as const;

/**
 * Rules whose violations are ALREADY IN THE LEDGER. Listing a rule here does not silence it —
 * the count is asserted below, so the number may not grow.
 *
 * **Empty, as a result.** It held `nested-interactive` when P4 built this file: 21 sites of
 * `<Link><Button>`, including `shared/api-error-notice`, which put an invalid nesting into every
 * error state in the product. P3 replaced all of them with a single `ButtonLink`, so the rule is
 * enforced here like any other.
 */
const KNOWN = new Set<string>();

/**
 * PINNED PER ROUTE, not globally — the difference matters. A rule in `KNOWN` above is excused
 * everywhere; a rule pinned here is excused on ONE screen, so the same defect appearing on a
 * second screen still turns the suite red. That is the whole reason the map exists instead of
 * one more entry in the set.
 *
 * **Currently empty, and that is a result rather than an oversight.** It carried one entry when
 * P4 built this file: `/knowledge` + `link-in-text-block`, a WCAG 1.4.1 Level A failure this gate
 * found on its first run after the manual sweep of all 42 screens had walked past it. P3 fixed
 * it — the link is underlined at rest — so the pin came out with the defect.
 *
 * Add an entry only for a defect that is IN THE LEDGER with a reason, and delete it with the fix.
 */
const PINNED: Record<string, ReadonlySet<string>> = {};

const BLOCKING = ['serious', 'critical'];

test.describe('accessibility', () => {
  for (const route of SCREENS) {
    test(`${route} has no serious or critical violations`, async ({ page }) => {
      await page.goto(route);
      await page.locator('main, [role="main"]').first().waitFor();
      await settle(page);

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .disableRules(['color-contrast'])
        .analyze();

      const pinned = PINNED[route] ?? new Set<string>();
      const blocking = results.violations.filter(
        (v) => BLOCKING.includes(v.impact ?? '') && !KNOWN.has(v.id) && !pinned.has(v.id)
      );

      /**
       * The message carries the rule id, the node count and the first selector — enough to act
       * on from a CI log without re-running locally, which is the difference between a gate
       * people fix and a gate people re-run hoping it was flaky.
       */
      const summary = blocking
        .map((v) => `${v.id} (${v.impact}, ${v.nodes.length}×) — ${v.nodes[0]?.target.join(' ')}`)
        .join('\n');

      expect(blocking, `${route}\n${summary}`).toHaveLength(0);
    });
  }

  /**
   * F001, now a guard rather than a pin. The 21 nested pairs are gone — `<Link><Button>` became
   * `ButtonLink`, one element wearing the button's own classes — and this keeps them gone.
   *
   * The feed is the sample because it is the busiest surface: if the pattern comes back anywhere
   * shared (`api-error-notice` is the one that reached everything), it surfaces here first.
   */
  test('F001: the nested-interactive count does not grow', async ({ page }) => {
    await page.goto('/newsfeed');
    await page.locator('main').waitFor();
    await settle(page);

    const nested = await page.evaluate(
      () => document.querySelectorAll('a button, button a, a a, button button').length
    );

    /**
     * The shell alone renders two (`ledger.tsx:190`/`:193` for a guest, `shell.tsx:474`/`:479`),
     * and a signed-in feed renders none of those — so the floor here is zero and any growth is
     * new code. Asserted as a ceiling rather than an equality: the feed's own content varies.
     */
    expect(
      nested,
      'a new <Link><Button> reached the feed — see report §3.8 F001'
    ).toBeLessThanOrEqual(0);
  });
});
