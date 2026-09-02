import { test, expect } from '@playwright/test';
import { firstPostHref, firstProfileHref } from './discover';

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
  // `/trending` LEFT THIS LIST because it left the product: it is `/newsfeed`'s `Công nghệ` tab
  // now and the route only redirects, so it has no title of its own to carry. The redirect has a
  // test of its own below.
  ['/search', 'Tìm kiếm · Elite Nexus'],
  ['/notifications', 'Thông báo · Elite Nexus'],
  ['/profile', 'Trang cá nhân · Elite Nexus'],
  ['/projects', 'Dự án · Elite Nexus'],
  ['/roadmap', 'Lộ trình · Elite Nexus'],
  ['/knowledge', 'Kho lưu trữ · Elite Nexus'],
  ['/library', 'Thư viện · Elite Nexus'],
  ['/chats', 'Chats · Elite Nexus'],
  ['/friends/requests', 'Lời mời kết bạn · Elite Nexus'],
  /*
   * THE SETTINGS HUB, whose six routes carried no title of their own until 02/09 — every one of
   * them reported the root layout's bare `Elite Nexus`, which is the exact failure
   * `core/i18n/server.ts` exists to prevent and the one its own note says was fixed everywhere.
   * Two of the six are listed rather than all: they share one pattern, and a table that repeats
   * it six times is a table nobody reads.
   */
  ['/settings/tokens', 'Access token · Cài đặt · Elite Nexus'],
  ['/settings/github', 'GitHub · Cài đặt · Elite Nexus'],
];

/*
 * The two DYNAMIC routes are tested separately, below, because their paths are discovered rather
 * than named: a dynamic segment's title says the KIND and not the item (resolving the item would
 * mean fetching it during server render with the reader's own session — see `core/i18n/server.ts`),
 * and this table used to carry `/posts/5055` and `/u/backend_truc_anh`, both deleted by the 02/09
 * re-seed. See `discover.ts`.
 */

test.describe('shell', () => {
  for (const [path, title] of TITLES) {
    test(`${path} carries its own title`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveTitle(title);
    });
  }

  test('a permalink carries the kind as its title, not the post', async ({ page }) => {
    await page.goto(await firstPostHref(page));
    await expect(page).toHaveTitle('Bài viết · Elite Nexus');
  });

  test('a profile carries the kind as its title, not the person', async ({ page }) => {
    await page.goto(await firstProfileHref(page));
    await expect(page).toHaveTitle('Hồ sơ lập trình viên · Elite Nexus');
  });

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

    /**
     * `Từ bên ngoài` IS ASSERTED ABSENT, WHICH IS THE ASSERTION THAT USED TO BE ITS OPPOSITE.
     *
     * That section counted crawled items per source out of the page it had already fetched — so
     * the three numbers summed to the trending `PAGE_SIZE` by construction — and it sat beside a
     * feed that interleaves those very items. It is a guest-only card now; `guest.spec.ts` covers
     * it there, in its rewritten form.
     *
     * The signed-in replacement is NOT asserted present here, and deliberately — nor is its
     * ranked heading `Phù hợp với bạn`: `OpeningsSection` renders nothing when the profile-ranked
     * list is empty AND the first page of `/projects` holds no project with an open position,
     * which is a fact about the demo database rather than about the shell. Which of its two
     * headings appears is a fact about the seeded professional profile, for the same reason. This
     * test is "the flank is there at 1440" — pinning it to seed data would make it fail for a
     * reason it does not test.
     */
    await expect(ledger.getByRole('heading', { name: 'Từ bên ngoài' })).toHaveCount(0);
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

    // `Xu hướng` is absent for the opposite reason: it is not a destination any more. The row
    // used to exist for GUESTS only — promoted into their rail because it was the second and last
    // thing they could open — which meant one piece of content had two homes depending on who was
    // asking. It is a tab on the feed now, for everyone.
    await expect(nav.getByRole('link', { name: 'Xu hướng' })).toHaveCount(0);
  });

  test('/trending forwards to the feed tab that replaced it', async ({ page }) => {
    // The route is in bookmarks, in `src/middleware.ts`'s guest list and in links people have
    // already sent each other, so it forwards rather than 404s. The assertion is the whole
    // contract: the address changes, and the tab the reader wanted is the one that is selected.
    await page.goto('/trending');

    await expect(page).toHaveURL(/\/newsfeed\?tab=tech$/);
    await expect(page.getByRole('tab', { name: 'Công nghệ', selected: true })).toBeVisible();
  });
});
