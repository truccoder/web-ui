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
 *  - the FILTER ROW itself. It has been a tab strip, then a `<select>` whose three names were
 *    `<option>` elements, and is now four radios in a popover whose names are `<label>`s. `Badge`
 *    renders a `<span>`, so intersecting on the element separates a label on a card from the
 *    control that chose it through all three. That is the point of the intersection: the control
 *    has changed shape twice and this helper has not had to change once.
 *  - the LEDGER's "Từ bên ngoài" section, which names each source it has a headline from — that is
 *    the flank, an `<aside>` beside `<main>` rather than inside it, so scoping to `main` drops it.
 *    The exclusion outlived two rewrites of that card (three counts → three headlines) and one
 *    narrowing of where it appears (both columns → guests only), because it was never about what
 *    the card holds: `main` is the boundary, and the flank is on the other side of it.
 *
 * Neither exclusion is decoration: remove either one and this file goes green on a broken filter.
 */
function cardSources(page: Page) {
  return page
    .locator('main')
    .getByText(new RegExp(`^(${SOURCES.join('|')})$`))
    .and(page.locator('span'));
}

/**
 * THE SCREEN MOVED AND THE TESTS DID NOT HAVE TO. What was `/trending` is now the `Công nghệ` tab
 * on the feed, rendering the same `TrendingList` with the same filters — so everything below is
 * unchanged apart from this address. It goes straight to the tab rather than through `/trending`'s
 * redirect: the redirect is asserted once in `shell.spec.ts`, and a suite that reached its subject
 * through it would be testing the forward on every case.
 */
async function openTrending(page: Page) {
  await page.goto('/newsfeed?tab=tech');
  // Cards are client-side data, so waiting on one is also what makes the filter clicks below
  // land on a hydrated page — the same hydration race that first broke `newsfeed.spec.ts`.
  await expect(page.locator('main a[href^="http"]').first()).toBeVisible({ timeout: 20_000 });
}

/**
 * The two settings that are not chips live behind one button now — the round that put the topic
 * chips on a single scrolling line and folded range and source into a panel. Opening it is a step
 * the old `<select>` did not need, so it is a helper rather than two copies of the same click.
 *
 * It returns the PANEL, not the page: every locator below should be scoped to it, so a test cannot
 * accidentally match the same word somewhere else on the feed.
 */
async function openFilters(page: Page) {
  await page.getByRole('button', { name: /^Bộ lọc/ }).click();
  const panel = page.getByRole('dialog', { name: 'Bộ lọc' });
  await expect(panel).toBeVisible();
  return panel;
}

test.describe('trending', () => {
  test('offers all three sources as filters', async ({ page }) => {
    await openTrending(page);

    const panel = await openFilters(page);

    // A `group`, which is what a `<fieldset>` with a `<legend>` is to a screen reader. The
    // assertion is on the ROLE rather than the tag for the same reason it was through the
    // `combobox` round: it says what the control is FOR a reader rather than how it is built, and
    // the accessible name — `Lọc theo nguồn` — has survived all three shapes unchanged.
    const sources = panel.getByRole('group', { name: 'Lọc theo nguồn' });
    await expect(sources).toBeVisible();

    // Three sources AND an unfiltered default — the script switches between them to show the
    // sources are real, which needs a way back.
    //
    // READ OFF THE LABELS, WITH THE EMPTY ONES DROPPED. `Radio` renders TWO `<label>`s per option:
    // the visible text, and an `aria-hidden` one that draws the circle and holds no text at all.
    // Filtering on "has a non-space character" keeps the four that name something. The count is
    // asserted separately against the radios themselves, so a label going missing cannot quietly
    // shorten the expected list into agreement.
    await expect(sources.getByRole('radio')).toHaveCount(4);
    await expect(sources.locator('label').filter({ hasText: /\S/ })).toHaveText([
      'Mọi nguồn',
      ...SOURCES,
    ]);
  });

  test('filtering by a source narrows the list to that source', async ({ page }) => {
    await openTrending(page);

    // OPENED ONCE, FOR THE WHOLE LOOP. The panel does not close on a pick — a reader narrowing by
    // source often sets the range in the same visit — so reopening between iterations would be
    // testing a close-on-select this screen deliberately does not do.
    const sources = (await openFilters(page)).getByRole('group', { name: 'Lọc theo nguồn' });

    for (const source of SOURCES) {
      // CLICK THE LABEL, NOT THE INPUT. `Radio` hides its `<input>` with `sr-only` — a 1×1 box
      // clipped to nothing — so a click aimed at the input's own centre lands on whatever is
      // painted there instead. The `<label for>` is the control a person actually presses, and
      // pressing it checks the input the same way.
      await sources.getByText(source, { exact: true }).click();
      await expect(sources.getByRole('radio', { name: source })).toBeChecked();

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
