import { test, expect, type Page } from '@playwright/test';

/**
 * Act 3's search beat, which is the one claim in `docs/demo-script.md` that is proved by typing
 * rather than by explaining:
 *
 *   > "Gõ vào ô tìm kiếm: `nguyen` (cố ý không dấu, không viết hoa) … Gõ lại thành `Nguyễn`
 *   > có dấu — **ra đúng cùng một kết quả**. Đó là cách chứng minh trực tiếp nhất."
 *
 * A test for it has to compare the two spellings against EACH OTHER rather than against the
 * numbers the script quotes. Asserting "8 người · 2 bài" would encode today's seed data into the
 * suite, and then the day someone adds a user called Nguyên the test goes red while the product
 * is working perfectly. What matters is the invariant — fold the diacritics and the case, get the
 * same answer — and that stays true whatever the database holds.
 *
 * IT IS ALSO A TRAP WORTH KNOWING ABOUT. Checking this by hand from a shell is how you get a
 * false alarm: on Windows a `curl` with `Nguyễn` in the argument goes through the console's
 * cp1252 codepage and reaches the backend as mojibake, which answers 0 results and looks exactly
 * like a broken feature. Measured on 22/08 — it took a second run through a UTF-8 client to show
 * the backend had been right all along. A browser has no such problem, which is one more reason
 * for this assertion to live here rather than in a script.
 */

/** The section headings are `Mọi người (N)` · `Bài viết (N)` · `Sách (N)`. */
const SECTION = /^(Mọi người|Bài viết|Sách) \((\d+)\)$/;

/**
 * Every result section on screen, as `{ heading: count }`.
 *
 * Reads the COUNTS OUT OF THE HEADINGS rather than counting rendered cards, because the headings
 * are what the backend said and the cards are what survived rendering — and when those two
 * disagree that is a bug this test should not paper over. A count of cards would also make the
 * assertion depend on virtualisation or pagination arriving later.
 */
async function sections(page: Page): Promise<Record<string, number>> {
  const headings = await page.getByText(SECTION).allInnerTexts();
  return Object.fromEntries(
    headings.map((text) => {
      const [, label, count] = SECTION.exec(text.trim())!;
      return [label, Number(count)];
    })
  );
}

async function search(page: Page, query: string): Promise<Record<string, number>> {
  await page.goto(`/search?q=${encodeURIComponent(query)}`);

  // THE SEARCH FIELD ECHOES THE TERM, so waiting on it proves the page read the URL — without
  // this, an empty result set and a page that has not rendered yet look identical.
  //
  // IT USED TO BE A HEADING (`Kết quả cho "…"`), removed with `PageHeader` in `8f0cf5c`, and for
  // a while afterwards the term appeared NOWHERE on the results screen — the field was empty too.
  // The field is filled from `?q=` again (`SearchBar`), which is both what a reader needs in order
  // to refine a search and what this wait can hang on.
  await expect(page.getByRole('searchbox')).toHaveValue(query);

  // Results arrive from a query, so the first paint is the loading state. Waiting for either a
  // section or the empty state means an genuinely empty answer fails on the comparison below
  // rather than on a timeout that says nothing about why.
  await expect(
    page
      .getByText(SECTION)
      .first()
      .or(page.getByText('Không có kết quả', { exact: true }))
  ).toBeVisible({
    timeout: 15_000,
  });

  return sections(page);
}

test.describe('search', () => {
  test('folds diacritics and case: nguyen · Nguyen · Nguyễn all agree', async ({ page }) => {
    const plain = await search(page, 'nguyen');

    // Guards the comparison itself. Without it, a search that silently returned nothing for every
    // spelling would satisfy "they agree" and pass — three empty answers are equal too.
    expect(Object.values(plain).reduce((a, b) => a + b, 0)).toBeGreaterThan(0);

    expect(await search(page, 'Nguyen')).toEqual(plain);
    expect(await search(page, 'Nguyễn')).toEqual(plain);
    expect(await search(page, 'nguyễn')).toEqual(plain);
  });

  test('answers across all three branches, not just posts', async ({ page }) => {
    // `SearchResponse` grew its third branch at B3, and the script leans on it: "Tìm cùng lúc
    // trên người dùng, bài viết và thư viện tài liệu, bằng một truy vấn." Two different terms
    // are needed to show it, because no seeded term matches all three at once — `nguyen` is
    // people and posts, `spring` is posts and a book.
    const people = await search(page, 'nguyen');
    expect(people).toHaveProperty('Mọi người');
    expect(people).toHaveProperty('Bài viết');

    const library = await search(page, 'spring');
    expect(library).toHaveProperty('Bài viết');
    expect(library).toHaveProperty('Sách');
  });

  test('a term with no matches says so instead of rendering an empty page', async ({ page }) => {
    // The script warns the presenter off `hieu nang` for exactly this reason — it matches
    // nothing. What it must NOT do is look broken.
    await page.goto('/search?q=zzzzzkhongcogi');
    await expect(page.getByText('Không có kết quả', { exact: true })).toBeVisible({
      timeout: 15_000,
    });
  });
});
