import { test, expect } from '@playwright/test';

/**
 * Act 2: "uy tín đến từ sổ cái, không phải tự khai" — the part of the script that gets the most
 * time, because it is the thesis's actual argument.
 *
 * THE ONE INVARIANT WORTH GUARDING IS A NEGATIVE ONE: the client never derives a level from a
 * score. `RepScore` takes `levelName` as a prop and prints the suffix only when the API supplied
 * one — "Tên cấp độ do server quyết định, client không bao giờ tự suy ra từ con số." The
 * thresholds exist in the backend's `RepLevel` enum and nowhere here, and the moment someone
 * "helpfully" adds `score > 100 ? 'Contributor' : 'Newcomer'` to a component, the product starts
 * telling people a level the server disagrees with.
 *
 * That is hard to assert directly — you cannot see an absent calculation. What you CAN assert is
 * the shape it produces: the level always arrives attached to a score, never on its own, and it
 * reads as a name rather than as a number the page did arithmetic on.
 *
 * Read-only throughout. Submitting a skill verification is Act 2's other half and it is not
 * tested here: it writes to the queue an admin later approves, and approving moves an Elite Score
 * across a level threshold. See the read-only rule in `playwright.config.ts`.
 */

/** `<score> · <level>` as `RepScore` renders it — the level is a suffix, never a standalone. */
const SCORE_WITH_LEVEL = /\d+\s*·\s*\S+/;

test.describe('reputation', () => {
  test('the profile shows a score with a server-supplied level', async ({ page }) => {
    await page.goto('/profile');

    // The score sits beside the name in the profile hero. Waiting on the pattern rather than on a
    // literal keeps the test alive as the demo account's score moves — and it will move, that is
    // the point of the feature.
    await expect(page.getByText(SCORE_WITH_LEVEL).first()).toBeVisible({ timeout: 20_000 });
  });

  test('verified skills are listed as evidence, not claimed', async ({ page }) => {
    await page.goto('/profile');

    // THE SECTION IS ONE TAB IN NOW. `/profile` is a hero plus three tabs — `Tổng quan` ·
    // `Chuyên môn` · `Tài khoản` — and skills sit with the professional profile and GitHub, the
    // three things that answer "what can this person demonstrate". Clicking rather than going
    // straight to `?tab=professional` keeps the assertion on the reader's own path, and proves
    // the panel actually mounts rather than that the URL is accepted.
    await page.getByRole('tab', { name: /chuyên môn/i }).click();

    // "Những kỹ năng đã được quản trị viên xác minh." The section exists whether or not this
    // account has any — an empty state is still the honest answer, and a missing section is not.
    await expect(page.getByRole('heading', { name: /kỹ năng/i }).first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test('a public profile shows the same score, from the same source', async ({ page }) => {
    // `/u/{username}` is keyed on the username, and B2 put `levelName` on the public profile DTO
    // so this screen no longer has to print a dash where the product's central claim goes.
    await page.goto('/u/backend_truc_anh');

    await expect(page.getByText(SCORE_WITH_LEVEL).first()).toBeVisible({ timeout: 20_000 });
  });

  test('the roadmap lists its paths and opens one', async ({ page }) => {
    await page.goto('/roadmap');

    /**
     * `Backend cho người mới` (id 2001, 12 nodes). Asserting the name rather than the count: a
     * roadmap gaining a node is content, not a regression.
     *
     * THE NAME CHANGED UNDER THIS TEST, WHICH IS WORTH RECORDING RATHER THAN QUIETLY EDITING. It
     * read `Backend Developer` and that row no longer exists: the third-generation seed
     * (`V80`–`V92`, 2026-08-28) dropped the whole `V50`–`V79` range and `V88` rebuilt the tracks
     * with Vietnamese names. A test naming seeded content is a test that breaks when the seed is
     * rebuilt, and the alternative — matching a pattern loose enough to survive any seed — would
     * assert that SOME track exists, which is not what this test is for.
     */
    const backend = page.getByText('Backend cho người mới').first();
    await expect(backend).toBeVisible({ timeout: 20_000 });
    await backend.click();

    // Opening one navigates to that track's detail view: the list gives way to a back link, the
    // track's name as a heading, and its steps. Nothing is submitted here; see the file note.
    await expect(page).toHaveURL(/\/roadmap\?id=\d+/);
    await expect(page.getByRole('heading', { name: 'Backend cho người mới' })).toBeVisible({
      timeout: 15_000,
    });

    // The legend naming the three states a node can be in — text only the open track produces.
    for (const state of ['Đã xác minh', 'Chờ duyệt', 'Chưa bắt đầu']) {
      await expect(page.getByText(state, { exact: true }).first()).toBeVisible({ timeout: 15_000 });
    }

    // The steps themselves. `Giao thức HTTP` is node 1 of roadmap 2001 — content, so a name rather
    // than a count.
    await expect(page.getByText('Giao thức HTTP').first()).toBeVisible();

    /**
     * AND ITS DESCRIPTION, which is a new assertion rather than a renamed one. All 103 seeded nodes
     * carry a hand-written description and none of it reached the screen: the horizontal chain
     * rendered `name` only, and the one component that did render descriptions was mounted by no
     * route. It is the only text on this page that says what a skill MEANS, so it is worth a test
     * that fails if it silently stops being rendered again.
     */
    await expect(page.getByText('Phân biệt 401 và 403', { exact: false }).first()).toBeVisible();

    /**
     * THE BACK LINK LEADS TO THE LIST — both halves asserted, because the pair is the change. The
     * detail view used to be a focus-mode shape whose context bar read `Bảng tin / Lộ trình` and
     * whose arrow discarded the list the reader had just picked from. Now a plain `Lộ trình` link
     * at the top of the canvas returns there. Scoped to `main` so it is the back link and not the
     * rail's identically-named nav row, which is on screen again now that focus mode is gone.
     */
    await page.getByRole('main').getByRole('link', { name: 'Lộ trình' }).click();
    await expect(page).toHaveURL(/\/roadmap$/);
    await expect(page.getByText('Backend cho người mới').first()).toBeVisible();
  });
});
