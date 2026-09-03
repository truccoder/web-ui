import { test, expect, type Page } from '@playwright/test';

/**
 * THE LAYOUT INVARIANTS, asserted at every width the shell actually has a different shape at.
 *
 * ── Why this file rather than screenshots ────────────────────────────────────────────────────
 *
 * `docs/ui-audit-plan.md` P4 asks for visual regression, and `visual.spec.ts` next door provides
 * it. But the audit that produced that plan found something the plan did not predict: of the
 * fourteen defects in `docs/ui-audit-report.md`, the recurring SHAPE is not "a value drifted" —
 * it is **two branches of one screen disagreeing with each other**.
 *
 *   A002  `/newsfeed`'s two tabs render the same card column at 12 and at 20.
 *   C002  three of `/settings`' six tabs put content on a card; three do not.
 *   B001  three of four detail pages space the back link at 40; the fourth, which is the one
 *         carrying a written argument for its number, uses 20.
 *   I001  one URL renders a 404 for a signed-in reader and a login form for a guest.
 *
 * A screenshot catches those only if a human looks at two images side by side and notices. A
 * NUMBER catches them the moment they diverge, and says which number is wrong. So the invariants
 * come first and the pictures second.
 *
 * ── Why not a `chromium-mobile` project ──────────────────────────────────────────────────────
 *
 * The plan proposed adding one to `playwright.config.ts`. Measured before adopting: a project
 * applies to the whole suite, and `shell.spec.ts:95` asserts *"the ledger flank is present at the
 * demo width"* — a claim that is true at 1440 and false at 375 by design. A mobile project would
 * turn a correct assertion red. The widths are therefore driven inside this file, where each one
 * is paired with what it is supposed to prove.
 *
 * ── Read-only, like the rest of `e2e/` ───────────────────────────────────────────────────────
 *
 * Every assertion here is a measurement. Nothing is typed, submitted or clicked.
 */

/**
 * The five shapes the shell has. Not five round numbers: each is the first width at which
 * something in `(main)/shell.tsx` changes, read off the source rather than guessed.
 *
 *  - 375  · phone. Drawer, no rail, no ledger; the wordmark and the search field collapse.
 *  - 768  · still Drawer — `lg` (1024) is where the rail arrives, not `md`.
 *  - 1024 · rail appears (`lg:flex`), ledger still absent.
 *  - 1280 · ledger appears (`xl:flex`) at its narrow width; shell caps at 1240.
 *  - 1440 · ledger widens; shell caps at 1300. The width the product is designed at.
 */
const WIDTHS = {
  phone: 375,
  tablet: 768,
  rail: 1024,
  ledgerNarrow: 1280,
  full: 1440,
} as const;

/** Every canvas route is capped here — `--spacing-nx-canvas`. */
const CANVAS = 672;

async function measure(page: Page) {
  return page.evaluate(() => {
    const main = document.querySelector('main');
    const doc = document.documentElement;
    const asides = [...document.querySelectorAll('aside')]
      .map((a) => ({
        width: Math.round(a.getBoundingClientRect().width),
        shown: getComputedStyle(a).display !== 'none',
      }))
      .filter((a) => a.shown);
    return {
      viewport: doc.clientWidth,
      /** `scrollWidth > clientWidth` is the only honest test for "the page scrolls sideways". */
      overflow: doc.scrollWidth - doc.clientWidth,
      canvas: main ? Math.round(main.getBoundingClientRect().width) : null,
      canvasPadding: main ? getComputedStyle(main).padding : null,
      asideWidths: asides.map((a) => a.width),
    };
  });
}

test.describe('layout invariants', () => {
  /**
   * NOTHING MAY SCROLL SIDEWAYS, at any width, on any route. This is the cheapest assertion in
   * the file and the one most likely to catch a real regression: a fixed width, a `whitespace-
   * nowrap` row or a non-responsive grid all surface here as a number greater than zero.
   */
  const ROUTES = [
    '/newsfeed',
    '/newsfeed?tab=posts',
    '/notifications',
    '/friends/all',
    '/library',
    '/projects',
    '/knowledge',
    '/settings/notifications',
    '/profile',
  ];

  for (const [name, width] of Object.entries(WIDTHS)) {
    test(`no horizontal overflow at ${width} (${name})`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      for (const route of ROUTES) {
        await page.goto(route);
        await page.locator('main').waitFor();
        const m = await measure(page);
        expect(m.overflow, `${route} scrolls sideways at ${width}`).toBe(0);
      }
    });
  }

  /**
   * THE CANVAS IS 672 EVERYWHERE IT FITS, and the gutter it keeps is paid on one axis only.
   * `20px 0 48px` from `lg` up (the shell supplies the horizontal gutter) and `20px 20px 48px`
   * below it (the canvas pays its own). 48 is `--nx-space-runout`, the clearance under a
   * scroller's last item; 20 is the block rung.
   */
  test('the canvas keeps its measure and its per-axis padding', async ({ page }) => {
    for (const width of [WIDTHS.rail, WIDTHS.ledgerNarrow, WIDTHS.full]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/newsfeed');
      await page.locator('main').waitFor();
      const m = await measure(page);
      expect(m.canvas, `canvas at ${width}`).toBe(CANVAS);
      expect(m.canvasPadding, `canvas padding at ${width}`).toBe('20px 0px 48px');
    }

    for (const width of [WIDTHS.phone, WIDTHS.tablet]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/newsfeed');
      await page.locator('main').waitFor();
      const m = await measure(page);
      expect(m.canvasPadding, `canvas padding at ${width}`).toBe('20px 20px 48px');
    }
  });

  /**
   * THE FLANKS ARRIVE ON THEIR OWN BREAKPOINTS, and they are different breakpoints. The rail is
   * `lg` (1024); the ledger is `xl` (1280). A comment in `shell.tsx` says the ledger is "hidden
   * below 1024" — measured, it is hidden below 1280, and this test is what makes the difference
   * matter. Widths are the tokens: sidebar 210, ledger-sm 310, ledger 338.
   */
  test('the rail and the ledger appear on their own breakpoints', async ({ page }) => {
    const at = async (width: number) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/newsfeed');
      await page.locator('main').waitFor();
      return (await measure(page)).asideWidths;
    };

    expect(await at(WIDTHS.phone), 'no flank on a phone').not.toContain(210);
    expect(await at(WIDTHS.tablet), 'no rail below lg').not.toContain(210);

    const rail = await at(WIDTHS.rail);
    expect(rail, 'rail at lg').toContain(210);
    expect(rail, 'no ledger below xl').not.toContain(310);

    expect(await at(WIDTHS.ledgerNarrow), 'ledger-sm at xl').toEqual(
      expect.arrayContaining([210, 310])
    );
    expect(await at(WIDTHS.full), 'full ledger at 1440').toEqual(
      expect.arrayContaining([210, 338])
    );
  });

  /**
   * `/chats` IS THE ONE FULL-BLEED TENANT: it fills the viewport instead of growing the page, so
   * the composer never falls below the fold. Both halves are asserted — a page that scrolls and
   * a composer out of reach are the same bug seen from two sides.
   */
  test('/chats fills the viewport and keeps its composer in it', async ({ page }) => {
    await page.setViewportSize({ width: WIDTHS.full, height: 900 });
    await page.goto('/chats');

    /**
     * Poll for the conversation list rather than waiting on a locator. Two reasons, both learned
     * the hard way here: the list arrives from a fetch so it is not in the first paint, and
     * `/chats` is the full-bleed tenant — the rail `<aside>` is present in the DOM but `hidden`,
     * so a `main, aside` locator resolves to an element that will never become visible and burns
     * the whole timeout waiting for it.
     */
    const rowCount = () =>
      page.evaluate(
        () =>
          [...document.querySelectorAll('button, li, a')].filter((n) => {
            const r = n.getBoundingClientRect();
            return (
              r.height > 40 &&
              r.height < 110 &&
              r.width > 150 &&
              r.width < 400 &&
              n.querySelector('img, [class*=rounded-nx-full]')
            );
          }).length
      );
    await expect.poll(rowCount, { timeout: 20_000 }).toBeGreaterThan(0);

    /**
     * THE COMPOSER ONLY EXISTS ONCE A CONVERSATION IS OPEN — the landing state of `/chats` is
     * "Chọn một cuộc trò chuyện" with an empty transcript pane, so waiting for a `textarea` on
     * arrival times out against a page that is behaving correctly. Open the first conversation
     * first, and say out loud that we did.
     *
     * Clicking a row is a READ in this product: opening a thread marks nothing and writes
     * nothing back, so the suite's read-only rule (`playwright.config.ts`) still holds. The row
     * is found by shape rather than by name because the seed's conversation list is data, not
     * contract — `discover.ts` makes the same argument for permalinks.
     */
    const opened = await page.evaluate(() => {
      const row = [...document.querySelectorAll('button, li, a')].find((n) => {
        const r = n.getBoundingClientRect();
        return (
          r.height > 40 &&
          r.height < 110 &&
          r.width > 150 &&
          r.width < 400 &&
          n.querySelector('img, [class*=rounded-nx-full]')
        );
      });
      if (!row) return false;
      (row as HTMLElement).click();
      return true;
    });
    test.skip(!opened, 'no conversation in the seed to open — the composer cannot be measured');

    await page.locator('textarea, [contenteditable]').first().waitFor();
    const state = await page.evaluate(() => {
      const doc = document.documentElement;
      const composer = document.querySelector('textarea, [contenteditable]');
      return {
        pageScrolls: doc.scrollHeight > doc.clientHeight,
        composerBottom: composer ? Math.round(composer.getBoundingClientRect().bottom) : null,
        fold: doc.clientHeight,
      };
    });
    expect(state.pageScrolls, '/chats must not grow the page').toBe(false);
    expect(state.composerBottom).not.toBeNull();
    expect(state.composerBottom!, 'composer below the fold').toBeLessThanOrEqual(state.fold);
  });

  /**
   * H001 — a person's name must not be the only thing that gives up space.
   *
   * Before P3 the name was the sole shrinkable item on its row (`min-w-0` on the name, nothing on
   * the reputation chip), so the chip's min-content width was a floor and every pixel of overflow
   * came out of the name: `Phạm Văn Hoà` wanted 98px and got 61 while `591 · Contributor` kept all
   * 132. The assertion is deliberately about the RELATIONSHIP rather than about a pixel count —
   * the point is not that names never truncate, it is that a name is never crushed while the
   * annotation beside it is untouched. Report §3.5.
   */
  test('H001: a truncated name never sits beside an unshrunk reputation chip', async ({ page }) => {
    await page.setViewportSize({ width: WIDTHS.phone, height: 812 });
    await page.goto('/newsfeed?tab=posts');
    await page.locator('main').waitFor();
    await expect
      .poll(
        () => page.evaluate(() => document.querySelectorAll('[data-post-id], article').length),
        {
          timeout: 20_000,
        }
      )
      .toBeGreaterThan(0);

    const rows = await page.evaluate(() =>
      [...document.querySelectorAll('main *')]
        .filter((n) => {
          const style = getComputedStyle(n);
          return (
            style.textOverflow === 'ellipsis' &&
            n.scrollWidth > Math.ceil(n.getBoundingClientRect().width)
          );
        })
        .map((name) => {
          const sibling = [...(name.parentElement?.children ?? [])].find((s) => s !== name);
          if (!sibling) return null;
          const sr = sibling.getBoundingClientRect();
          return {
            name: (name.textContent ?? '').trim().slice(0, 24),
            siblingShrinks: getComputedStyle(sibling).flexShrink !== '0',
            siblingAtFullWidth: sibling.scrollWidth <= Math.ceil(sr.width),
          };
        })
        .filter(Boolean)
    );

    for (const row of rows) {
      expect(
        row!.siblingShrinks,
        `"${row!.name}" is truncated while the chip beside it cannot shrink at all`
      ).toBe(true);
    }
  });

  /**
   * E001 — `/chats` must offer a way out other than the one back link.
   *
   * It is the only full-bleed tenant: the rail is hidden at every width and the top bar is not
   * rendered, so the Drawer button on the context bar is the whole of navigation. It used to carry
   * `lg:hidden`, a convention borrowed from the shell where the rail takes over at `lg` — leaving
   * the widest screens with exactly one link off the page. Report §3.7.
   */
  test('E001: /chats keeps a navigation control at desktop widths', async ({ page }) => {
    for (const width of [WIDTHS.phone, WIDTHS.rail, WIDTHS.full]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/chats');
      const menu = page.getByRole('button', { name: /Mở điều hướng|Open navigation/i }).first();
      await expect(menu, `no navigation control at ${width}`).toBeVisible();
    }
  });

  /**
   * ── THE TWO INVARIANTS P2 RESTORED ───────────────────────────────────────────────────────
   *
   * Both of these shipped as `test.fail()` when P4 built this file: expected failures rather
   * than skips, so that they RAN, stayed red by agreement, and would turn the suite red the day
   * someone fixed the bug without deleting the marker.
   *
   * That is exactly what happened, and it is the reason the annotation was worth writing. P2
   * moved both columns to the block rung; the markers were then failing for being wrong rather
   * than for being unfixed, so they are gone and the assertions stand on their own.
   *
   * Leave them here. They are now the guard that stops the 12 coming back.
   */

  /**
   * A001 — card ↔ card in the feed. `density-r9.md:15` fixes it at 20 (`block`), the kit's own
   * feed column renders 20, and the R10 adherence note states the rule as "card ↔ card is the
   * rung above vertical card padding" — 16 here, so 20. `/newsfeed?tab=tech` renders 12, which
   * also puts the gap BETWEEN two cards below the padding INSIDE one: the proximity inversion
   * the surface model exists to prevent. See `docs/ui-audit-report.md` §3.2.
   */
  test('A001: the crawled feed spaces its cards at the block rung', async ({ page }) => {
    await page.setViewportSize({ width: WIDTHS.full, height: 900 });
    await page.goto('/newsfeed?tab=tech');
    await page.locator('main').waitFor();
    const gap = await page.evaluate(() => {
      const main = document.querySelector('main')!;
      for (const node of main.querySelectorAll('*')) {
        const style = getComputedStyle(node);
        if (style.display !== 'flex' || style.flexDirection !== 'column') continue;
        const kids = [...node.children].filter((k) => k.getBoundingClientRect().height > 60);
        if (kids.length < 3) continue;
        if (getComputedStyle(kids[0]).padding !== '16px 20px') continue;
        return parseFloat(style.rowGap);
      }
      return null;
    });
    expect(gap, 'card ↔ card must be the block rung').toBe(20);
  });

  /**
   * D001 — the same defect on `/knowledge`, where `ExplanationCard` carries a full card inset
   * (`16px 20px`) inside a `space-y-3` column. Listed separately from A001 because the mechanism
   * differs: this one is written with sibling margins rather than a container `gap`, so a refit
   * of the ladder would not reach it even after A001 is fixed. §3.4.
   */
  test('D001: saved explanations are spaced at the block rung', async ({ page }) => {
    await page.setViewportSize({ width: WIDTHS.full, height: 900 });
    await page.goto('/knowledge');
    await page.locator('main').waitFor();

    /**
     * WAIT FOR THE CARDS, and the reason is a lesson about `test.fail()` worth keeping.
     *
     * While this assertion carried the expected-failure marker it was green — but not because it
     * measured 12. The explanations arrive from a fetch, `main` paints before they do, and the
     * probe below was returning **null** for "fewer than two cards on screen". An expected
     * failure is satisfied by ANY failure, so a test that never measured anything looked exactly
     * like a test that measured the bug.
     *
     * That is the sharp edge of the annotation: it proves a test is red, not that it is red for
     * the stated reason. Only removing the marker after the fix exposed it. Poll first, so the
     * assertion can only fail on the number it is about.
     */
    const cardCount = () =>
      page.evaluate(
        () =>
          [...document.querySelectorAll('main *')].filter(
            (n) =>
              getComputedStyle(n).padding === '16px 20px' && n.getBoundingClientRect().width > 500
          ).length
      );
    await expect.poll(cardCount, { timeout: 20_000 }).toBeGreaterThan(1);

    const gap = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('main *')].filter(
        (n) => getComputedStyle(n).padding === '16px 20px' && n.getBoundingClientRect().width > 500
      );
      if (cards.length < 2) return null;
      const a = cards[0].getBoundingClientRect();
      const b = cards[1].getBoundingClientRect();
      return Math.round(b.top - a.bottom);
    });
    expect(gap, 'explanation ↔ explanation must be the block rung').toBe(20);
  });
});
