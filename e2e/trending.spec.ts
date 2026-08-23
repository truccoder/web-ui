import { test, expect, type Page } from '@playwright/test';

/**
 * Act 3's closing beat: the crawler, and the claim that its three sources are real.
 *
 *   > "Ba nguồn, lọc được theo từng nguồn, và khi để 'Tất cả nguồn' thì hệ thống trộn chúng theo
 *   > thứ hạng phần trăm trong từng nguồn — chứ không theo điểm thô."
 *
 * WHY THE MIXING RULE IS THE INTERESTING PART. The three sources count in wildly different units:
 * a GitHub star count runs to the hundreds of thousands where a Hacker News score runs to the
 * thousands. Sort the merged list by raw score and GitHub takes the whole first page, and the
 * "three sources" claim becomes true in the database and invisible on screen — which is exactly
 * what B8 was raised about. Ranking within each source before merging is the fix, and this file
 * checks the consequence a viewer can actually see: switch the filter and the source changes.
 *
 * Read-only. Trending has no write path from this screen anyway beyond saving an item to the
 * knowledge vault, which is a write and therefore not tested here.
 */

const SOURCES = ['GitHub', 'Hacker News', 'DEV Community'] as const;

/**
 * The source names printed ON THE CARDS, and only those.
 *
 * TWO OTHER PLACES ON THIS SCREEN SPELL THE SAME THREE NAMES, and a plain `getByText` collects
 * all of them — which makes every assertion below see all three sources whatever the filter says,
 * so the test passes while filtering is broken. Worse than failing. Both had to be found the hard
 * way, one after the other:
 *
 *  - the FILTER ROW itself. `Tabs` renders `<button role="tab">` where `Badge` renders a
 *    `<span>`, so intersecting on the element separates a label on a card from the control that
 *    chose it.
 *  - the LEDGER's "Từ bên ngoài" section, which lists each source with a count — that is the
 *    flank, an `<aside>` beside `<main>` rather than inside it, so scoping to `main` drops it.
 *
 * Neither exclusion is decoration: remove either one and this file goes green on a broken filter.
 */
function cardSources(page: Page) {
  return page
    .locator('main')
    .getByText(new RegExp(`^(${SOURCES.join('|')})$`))
    .and(page.locator('span'));
}

async function openTrending(page: Page) {
  await page.goto('/trending');
  // Cards are client-side data, so waiting on one is also what makes the filter clicks below
  // land on a hydrated page — the same hydration race that first broke `newsfeed.spec.ts`.
  await expect(page.locator('main a[href^="http"]').first()).toBeVisible({ timeout: 20_000 });
}

test.describe('trending', () => {
  test('offers all three sources as filters', async ({ page }) => {
    await openTrending(page);

    // A `tablist`, not a row of buttons — the filter is one choice among four, and the DS models
    // that as tabs. Asking for `button` here is the mistake this comment exists to prevent.
    const sources = page.getByRole('tablist', { name: 'Lọc theo nguồn' });
    await expect(sources.getByRole('tab', { name: 'Tất cả nguồn' })).toBeVisible();
    for (const source of SOURCES) {
      await expect(sources.getByRole('tab', { name: source, exact: true })).toBeVisible();
    }

    // Three sources AND an unfiltered default — the script switches between them to show the
    // sources are real, which needs a way back.
    await expect(sources.getByRole('tab')).toHaveCount(SOURCES.length + 1);
  });

  test('filtering by a source narrows the list to that source', async ({ page }) => {
    await openTrending(page);

    for (const source of SOURCES) {
      await page
        .getByRole('tablist', { name: 'Lọc theo nguồn' })
        .getByRole('tab', { name: source, exact: true })
        .click();

      // Wait for the list to come back before reading it: the filter is a server round trip, and
      // asserting immediately reads the previous source's cards and passes for the wrong reason.
      await expect(page.locator('main a[href^="http"]').first()).toBeVisible({ timeout: 15_000 });

      // EVERY card must name this source — one stray card is the whole bug. Reading the labels as
      // a set rather than checking the first card is what makes that true.
      const labels = await cardSources(page).allInnerTexts();
      expect(labels.length).toBeGreaterThan(0);
      expect(new Set(labels.map((l) => l.trim()))).toEqual(new Set([source]));
    }
  });

  test('the unfiltered list is not one source wearing three labels', async ({ page }) => {
    await openTrending(page);

    // The mixing rule, checked the only way a viewer can check it: with no filter, the first page
    // must carry more than one source. If raw-score sorting ever came back, GitHub's numbers
    // would flood this and the set collapses to one.
    const labels = await cardSources(page).allInnerTexts();
    const distinct = new Set(labels.map((l) => l.trim()));
    expect(distinct.size).toBeGreaterThan(1);
  });
});
