import { test, expect, type Page } from '@playwright/test';

/**
 * THE SIGNED-OUT READER — the surface opened so that a link to this product answers with the
 * product instead of a sign-in form.
 *
 * WHY IT NEEDS ITS OWN PROJECT RATHER THAN A `test.use` INSIDE AN EXISTING FILE. Every other spec
 * runs under `storageState: e2e/.auth/user.json`, and the thing under test here is the absence of
 * that state — not just the cookie the middleware reads, but the token pair in localStorage the
 * axios interceptor reads, which `storageState` also carries. `chromium-guest` in
 * `playwright.config.ts` starts from an empty browser and depends on no setup project, so it also
 * still runs on a day the login credentials are wrong.
 *
 * READ-ONLY IS FREE HERE, AND THAT IS THE POINT OF THE DESIGN. A guest has no write path at all:
 * `core/api/axios` refuses any non-GET before it is sent. So the two tests below that press
 * something a signed-in user would write with (a reaction, a comment) assert the prompt, and no
 * request reaches the demo database — the suite's hard rule (see `playwright.config.ts`) is
 * upheld by the feature rather than by care.
 *
 * THE HANDLE AND THE POST ARE DISCOVERED, NOT HARDCODED, except for `KNOWN_HANDLE`: the guest
 * surface has no search and the feed payload carries no author username (a backend gap recorded
 * in `features/security/hooks/use-profile.ts`), so there is no in-app path from a post to its
 * author's page. One seeded handle is the smallest hardcoded thing that lets the public profile
 * be tested at all.
 */

/** Seeded, and the same account `accounts.ts` signs the user suite in as. `/u/{username}`. */
const KNOWN_HANDLE = 'backend_truc_anh';

async function openGuestFeed(page: Page) {
  await page.goto('/newsfeed');
  // Posts are client-side data. Waiting for one is also what proves the interception in
  // `core/api/axios` lets `GET /posts/public` through — a missing entry in that allow-list shows
  // up here as an empty feed, not as an error.
  await expect(page.locator('main article, main [data-post-id]').first()).toBeVisible({
    timeout: 20_000,
  });
}

test.describe('guest', () => {
  test('reads the public feed with no session', async ({ page }) => {
    await openGuestFeed(page);

    // More than one card: a single one could be a skeleton or an error card that happens to match.
    expect(await page.locator('main article, main [data-post-id]').count()).toBeGreaterThan(1);
  });

  test('is offered an account instead of an identity', async ({ page }) => {
    await page.goto('/newsfeed');

    const bar = page.getByRole('banner');
    await expect(bar.getByRole('link', { name: 'Đăng nhập' })).toBeVisible();
    await expect(bar.getByRole('link', { name: 'Đăng ký' })).toBeVisible();

    // The signed-in cluster is the thing that must NOT be there: a bell that could only read zero
    // and a menu whose two items are a profile and a sign-out.
    await expect(bar.getByRole('button', { name: /thông báo/i })).toHaveCount(0);
  });

  test('is not shown controls it cannot use', async ({ page }) => {
    await openGuestFeed(page);

    // The composer: every one of its buttons is a write.
    await expect(page.getByPlaceholder(/bạn đang nghĩ gì/i)).toHaveCount(0);

    // The scope strip: `Bạn bè` and `Kỹ năng` are both `GET /feed`, a per-user Redis fan-out that
    // a guest has none of — so the strip is not rendered rather than rendered with one live tab.
    await expect(page.getByRole('tab', { name: 'Bạn bè' })).toHaveCount(0);
    await expect(page.getByRole('tab', { name: 'Kỹ năng' })).toHaveCount(0);
  });

  test('sends a locked destination through sign-in and remembers it', async ({ page }) => {
    await page.goto('/newsfeed');

    await page
      .getByRole('navigation', { name: 'Điều hướng chính' })
      .getByRole('link', { name: 'Chats' })
      .click();

    // `next` is what makes the lock a detour rather than a dead end: the middleware writes it and
    // `app/(auth)/post-auth-redirect.ts` reads it back after a successful sign-in.
    await expect(page).toHaveURL(/\/login\?next=%2Fchats/);
  });

  test('is invited to sign in when it reaches for a reaction', async ({ page }) => {
    await openGuestFeed(page);

    // A reaction is a write, and no request is made: `core/api/axios` rejects it in the request
    // interceptor and raises the prompt. Nothing here touches the demo database.
    await page.locator('main').getByRole('button', { name: 'Hữu ích' }).first().click();

    await expect(page.getByRole('dialog')).toContainText('Đăng nhập để tham gia');
  });

  test('opens a post permalink whole, and asks for an account to read the thread', async ({
    page,
  }) => {
    await openGuestFeed(page);

    await page.locator('main a[href^="/posts/"]').first().click();
    await expect(page).toHaveURL(/\/posts\/\d+/);
    await expect(page.locator('main article, main [data-post-id]').first()).toBeVisible({
      timeout: 20_000,
    });

    // `GET /posts/{id}/comments` is NOT one of the endpoints the backend opens anonymously, so the
    // thread must not expand into a panel that can never fill.
    await page
      .getByRole('button', { name: /bình luận/i })
      .first()
      .click();
    await expect(page.getByRole('dialog')).toContainText('Đăng nhập để tham gia');
  });

  test('opens a public profile — the link this whole surface exists for', async ({ page }) => {
    await page.goto(`/u/${KNOWN_HANDLE}`);

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(`@${KNOWN_HANDLE}`)).toBeVisible();

    // Reputation is a guest-readable endpoint of its own, and its presence is what proves the page
    // is the real profile rather than a shell that rendered before its data was refused.
    await expect(page.locator('main')).toContainText('Elite Score');

    // Message and block are relationships between two accounts; a guest is not one end of one.
    await expect(page.getByRole('button', { name: /nhắn tin/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /chặn/i })).toHaveCount(0);
  });
});
