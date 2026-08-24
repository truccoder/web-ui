import { test, expect } from '@playwright/test';

/**
 * The app shell: the things every route depends on and no single feature owns.
 *
 * ── The titles ──────────────────────────────────────────────────────────────────────────────
 * Until the per-route `layout.tsx` files landed, every route in the product rendered the same
 * `<title>`: `metadata` may only be exported from a server component and almost every page here
 * carries `'use client'`, so the root layout's `Elite Nexus` was the title of the newsfeed, the
 * moderation queue and someone's profile alike. The demo is given from two browser windows side
 * by side, which is the situation identical tabs are worst in.
 *
 * These assertions are cheap and they guard something a human reviewer never looks at — nobody
 * reads a tab while checking a pull request, so a title silently reverting to the default is
 * exactly the kind of regression that survives review. `core/i18n/server.ts` is the machinery.
 */

/** `<route, the title it must carry>`. Vietnamese because `vi` is `DEFAULT_LOCALE`. */
const TITLES: ReadonlyArray<readonly [string, string]> = [
  ['/newsfeed', 'Bảng tin · Elite Nexus'],
  ['/trending', 'Xu hướng · Elite Nexus'],
  ['/search', 'Tìm kiếm · Elite Nexus'],
  ['/notifications', 'Thông báo · Elite Nexus'],
  ['/profile', 'Trang cá nhân · Elite Nexus'],
  ['/projects', 'Dự án · Elite Nexus'],
  ['/roadmap', 'Lộ trình · Elite Nexus'],
  ['/knowledge', 'Kho lưu trữ · Elite Nexus'],
  ['/library', 'Thư viện · Elite Nexus'],
  ['/chats', 'Chats · Elite Nexus'],
  ['/friends/requests', 'Lời mời kết bạn · Elite Nexus'],
  // Dynamic segments name the KIND, not the item — resolving the item would mean fetching it
  // during server render with the reader's own session. See `core/i18n/server.ts`.
  ['/posts/5055', 'Bài viết · Elite Nexus'],
  ['/u/backend_truc_anh', 'Hồ sơ lập trình viên · Elite Nexus'],
];

test.describe('shell', () => {
  for (const [path, title] of TITLES) {
    test(`${path} carries its own title`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveTitle(title);
    });
  }

  test('the title follows the locale cookie', async ({ page, context }) => {
    // The locale is a cookie precisely so the SERVER can read it — it moved out of localStorage
    // because SSR could not see it there and every English user got a hydration mismatch. A title
    // is rendered on the server and nowhere else, so if that ever regressed, this is where it
    // shows: the page would come back Vietnamese with an `en` cookie set.
    await context.addCookies([{ name: 'app_locale', value: 'en', url: 'http://localhost:3000' }]);

    await page.goto('/newsfeed');
    await expect(page).toHaveTitle('Newsfeed · Elite Nexus');
  });

  test('an unknown URL renders the product 404, not the framework one', async ({ page }) => {
    // What this replaces is Next's built-in "404 · This page could not be found" — unstyled
    // black-on-white in a system font, on the page a stranger is most likely to land on.
    const response = await page.goto('/khong-co-trang-nay');

    // The status matters as much as the markup: a 404 rendered with a 200 is a soft 404, which
    // tells a crawler the page exists.
    expect(response?.status()).toBe(404);
    await expect(page.getByText('Trang này không tồn tại')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Về bảng tin' })).toBeVisible();
    await expect(page).toHaveTitle('Trang này không tồn tại · Elite Nexus');
  });

  test('the ledger flank is present at the demo width', async ({ page }) => {
    // `docs/demo-script.md` warns the presenter not to go under 1360 because the flank drops out
    // at the `xl` step and "bạn mất phần trưng bày uy tín" — the reputation column IS Act 2. The
    // config pins the viewport at 1440 for this reason; this test is what makes that pin load
    // bearing rather than decorative.
    await page.goto('/newsfeed');

    // The flank is a `complementary` landmark labelled `Tóm lược` — an `aria-label`, not visible
    // copy, so this has to ask for the role. Asserting on the label as text would fail while the
    // column was on screen and working, which is the wrong kind of red.
    const ledger = page.getByRole('complementary', { name: 'Tóm lược' });
    await expect(ledger).toBeVisible();

    // `Năng lực` is rendered by two different branches of `EvidenceSection` (loaded and empty),
    // so scope to the flank and take the first — the assertion is "the section is there", not
    // "there is exactly one of it".
    await expect(ledger.getByRole('heading', { name: 'Năng lực' }).first()).toBeVisible();
    await expect(ledger.getByRole('heading', { name: 'Từ bên ngoài' })).toBeVisible();
  });

  test('the rail reaches every primary surface', async ({ page }) => {
    await page.goto('/newsfeed');
    const nav = page.getByRole('navigation', { name: 'Điều hướng chính' });

    for (const label of ['Bảng tin', 'Chats', 'Dự án', 'Lộ trình', 'Thư viện', 'Kho lưu trữ']) {
      await expect(nav.getByRole('link', { name: label })).toBeVisible();
    }

    // `/admin/*` is deliberately absent: the middleware redirects an ADMIN session out of this
    // shell entirely, so an admin link here would be a link nobody who can see it may use.
    await expect(nav.getByRole('link', { name: /admin/i })).toHaveCount(0);
  });
});
