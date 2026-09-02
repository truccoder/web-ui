import { test, expect, type Page } from '@playwright/test';
import { firstPostHref } from './discover';

/**
 * Act 1: "là mạng xã hội, nhưng không phải mạng xã hội thường".
 *
 * The script makes three claims from this screen, and each is a decision a careless refactor
 * would quietly undo:
 *
 *  - the product carries two card shapes — community posts and crawled tech news — on two tabs
 *    (`Bài viết` and `Công nghệ`), and they are told apart before you read a word, because one
 *    opens with a face and a reputation chip and the other has nobody behind it to show;
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
  // `/newsfeed` bare is the `Công nghệ` tab now — crawled items, no posts. The community column
  // this file tests is `?tab=posts`.
  await page.goto('/newsfeed?tab=posts');
  await expect(postPermalinks(page).first()).toBeVisible({ timeout: 20_000 });
}

test.describe('newsfeed', () => {
  test('keeps community posts and crawled news on separate tabs, shaped differently', async ({
    page,
  }) => {
    // `Bài viết` is the community column: every card's own link is internal — it goes to the post.
    await page.goto('/newsfeed?tab=posts');
    await expect(postPermalinks(page).first()).toBeVisible({ timeout: 20_000 });
    expect(await postPermalinks(page).count()).toBeGreaterThan(0);

    // `Công nghệ` is the crawler's column. Its cards leave for the source and name that source,
    // because there is no author to name instead — and it carries no post permalinks at all, which
    // is the structural proof the two streams are no longer interleaved.
    await page.getByRole('tab', { name: 'Công nghệ' }).click();
    await expect(page.locator('main a[href^="http"]').first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/Hacker News|GitHub|DEV/).first()).toBeVisible();
    await expect(postPermalinks(page)).toHaveCount(0);
  });

  test('the composer offers all eight kinds behind one menu', async ({ page }) => {
    await openFeed(page);

    // The launcher's type menu is a `Button` labelled with the CURRENT kind, which starts at
    // `Trạng thái`. R4-4 collapsed nine chips into this menu and R5-2 moved it onto the launcher;
    // a regression to a chip row fails here on the button not existing.
    await page.getByRole('button', { name: 'Trạng thái' }).click();

    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();

    // THE CURRENT KIND IS NOT IN THE MENU, by design — `PostTypeMenu` filters it out because the
    // trigger already names it and offering it again is a row that does nothing. So this asserts
    // the seven kinds it can switch TO, plus the trigger above, which together are the eight.
    await expect(menu.getByRole('menuitem')).toHaveCount(POST_KINDS.length);

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

    // THE SET MOVED BEHIND A HOVER TRAY, AND THE CLAIM DID NOT CHANGE. This test used to assert
    // the seven were rendered inline, and cited that as why the vocabulary is readable without
    // touching anything. The owner replaced the inline row with one button plus a tray, so the
    // assertion is now "all seven are REACHABLE, and they still read as appraisal" — which is the
    // part the demo script actually promises. What must never come back is `LIKE` presented as
    // "Thích", and that is checked below exactly as before.
    //
    // `Hữu ích` is the trigger's own label, so hovering it is what opens the tray holding the
    // other six.
    await page.getByRole('button', { name: 'Hữu ích', exact: true }).first().hover();

    for (const label of REACTIONS) {
      await expect(page.getByRole('button', { name: label, exact: true }).first()).toBeVisible({
        timeout: 5_000,
      });
    }

    // The negative half of the claim, and the one a redesign would break silently.
    await expect(page.getByRole('button', { name: /^(Thích|Yêu thích)$/ })).toHaveCount(0);
  });

  test('a permalink opens its discussion already expanded', async ({ page }) => {
    // "Mở ra là bình luận đã bung sẵn, vì mọi lối vào trang này đều là người đi đọc một cuộc thảo
    // luận cụ thể." `defaultCommentsOpen` is the prop; the feed deliberately does the opposite,
    // which is what the second half of this test checks.
    await page.goto(await firstPostHref(page));

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
