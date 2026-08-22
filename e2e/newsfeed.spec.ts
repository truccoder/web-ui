import { test, expect, type Page } from '@playwright/test';

/**
 * Act 1: "là mạng xã hội, nhưng không phải mạng xã hội thường".
 *
 * The script makes three claims from this screen, and each is a decision a careless refactor
 * would quietly undo:
 *
 *  - the feed MIXES two shapes — community posts and crawled tech news — and they are told apart
 *    before you read a word, because one opens with a face and a reputation chip and the other
 *    has nobody behind it to show;
 *  - the reaction set is a TECHNICAL vocabulary — Hữu ích · Sáng tỏ · Ghi nhận · Xuất sắc · Khó
 *    hiểu · Không đồng tình — not like-and-heart;
 *  - the post kind is a PARAMETER of one action, eight of them behind one menu, not a row of
 *    buttons.
 *
 * NOTHING HERE POSTS, REACTS OR EDITS. Opening the composer's menu and reading it is as far as it
 * goes. See the read-only rule in `playwright.config.ts` — this is the file where the temptation
 * to break it is strongest, because "just one reaction" is exactly the shape of the change that
 * leaves a demo account with a reaction nobody made.
 */

/** The eight kinds, in the order the composer's menu offers them. */
const POST_KINDS = [
  'Trạng thái',
  'Code',
  'Bài viết',
  'Câu hỏi',
  'Bình chọn',
  'Liên kết',
  'Sách',
  'Sự kiện',
] as const;

/** The reaction vocabulary as the design system renamed it. `Haha` is excluded: it is legacy. */
const REACTIONS = ['Hữu ích', 'Sáng tỏ', 'Ghi nhận', 'Xuất sắc', 'Khó hiểu', 'Không đồng tình'];

/** A community post's permalink — the timestamp under the author's name links to `/posts/{id}`. */
const postPermalinks = (page: Page) => page.locator('main a[href^="/posts/"]');

/**
 * Open the feed and wait until it is BOTH rendered and interactive.
 *
 * THE SECOND HALF IS NOT PEDANTRY, IT IS THE BUG THIS FILE WAS FIRST WRITTEN WITH. Clicking the
 * composer's type button straight after `goto` did nothing at all and the menu never appeared —
 * the button is in the server-rendered HTML, so Playwright happily found it and clicked it before
 * React had attached `onClick`. The symptom is a locator timeout on the menu, which points at the
 * menu and not at the cause, and it is intermittent by nature: it fails on a cold server and
 * passes on a warm one.
 *
 * Waiting for a post to appear fixes it for a reason rather than by luck: the feed is client-side
 * data, so nothing can render it before the app is running.
 */
async function openFeed(page: Page) {
  await page.goto('/newsfeed');
  await expect(postPermalinks(page).first()).toBeVisible({ timeout: 20_000 });
}

test.describe('newsfeed', () => {
  test('mixes community posts with crawled news, and they are shaped differently', async ({
    page,
  }) => {
    await openFeed(page);

    // A community post's own link is internal — it goes to the post.
    expect(await postPermalinks(page).count()).toBeGreaterThan(0);

    // A crawled item's is not: it leaves for the source. That difference IS the claim — the two
    // kinds of card are not interchangeable rows with a different badge, they point elsewhere.
    const externalHeadlines = page.locator('main a[href^="http"]');
    expect(await externalHeadlines.count()).toBeGreaterThan(0);

    // And the crawled cards name their source, because there is no author to name instead.
    await expect(page.getByText(/Hacker News|GitHub|DEV/).first()).toBeVisible();
  });

  test('the composer offers all eight kinds behind one menu', async ({ page }) => {
    await openFeed(page);

    // The launcher's type menu is a `Button` labelled with the CURRENT kind, which starts at
    // `Trạng thái`. R4-4 collapsed nine chips into this menu and R5-2 moved it onto the launcher;
    // a regression to a chip row fails here on the button not existing.
    await page.getByRole('button', { name: 'Trạng thái' }).click();

    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();

    for (const kind of POST_KINDS) {
      await expect(menu.getByRole('menuitem', { name: kind, exact: true })).toBeVisible();
    }

    // Close without choosing: picking a kind OPENS the composer dialog, and this test has no
    // business inside a form that can post.
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
  });

  test('reactions read as appraisal, not approval', async ({ page }) => {
    await openFeed(page);

    // The whole set is rendered inline on every post rather than hidden behind a hover picker, so
    // the vocabulary is readable without touching anything — which is also why the presenter can
    // simply point at it. `LIKE` still travels on the wire as `LIKE`; what must never come back
    // is presenting it as "Thích".
    for (const label of REACTIONS) {
      await expect(page.getByRole('button', { name: label, exact: true }).first()).toBeVisible();
    }

    // The negative half of the claim, and the one a redesign would break silently.
    await expect(page.getByRole('button', { name: /^(Thích|Yêu thích)$/ })).toHaveCount(0);
  });

  test('a permalink opens its discussion already expanded', async ({ page }) => {
    // "Mở ra là bình luận đã bung sẵn, vì mọi lối vào trang này đều là người đi đọc một cuộc thảo
    // luận cụ thể." `defaultCommentsOpen` is the prop; the feed deliberately does the opposite,
    // which is what the second half of this test checks.
    await page.goto('/posts/5055');

    // The reply box only exists once the thread is open, so it is the cheapest proof that the
    // thread expanded without anyone pressing anything.
    await expect(page.getByRole('button', { name: 'Hữu ích' }).first()).toBeVisible({
      timeout: 20_000,
    });
    const replyBox = page.getByPlaceholder(/bình luận|trả lời/i).first();
    await expect(replyBox).toBeVisible({ timeout: 15_000 });

    // Same component in the feed, collapsed: there the thread is behind a button.
    await openFeed(page);
    await expect(page.getByPlaceholder(/bình luận|trả lời/i)).toHaveCount(0);
  });
});
