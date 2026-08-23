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

    // The script picks `Backend Developer` (id 2001, 13 nodes). Asserting the name rather than the
    // count: a roadmap gaining a node is content, not a regression.
    const backend = page.getByText('Backend Developer').first();
    await expect(backend).toBeVisible({ timeout: 20_000 });
    await backend.click();

    // Opening one shows its stages, its nodes, and a legend naming the three states a node can
    // be in. Nothing is submitted here; see the file note.
    //
    // ASSERTED ON THE LEGEND RATHER THAN ON THE ROADMAP'S NAME, because the open roadmap does not
    // print its own name anywhere in the canvas — the context bar carries the section ("Lộ
    // trình"), not the selection. Worth knowing when reading this test: the obvious assertion is
    // the one that fails, and it fails on a missing heading rather than on a broken roadmap.
    for (const state of ['Đã xác minh', 'Chờ duyệt', 'Chưa bắt đầu']) {
      await expect(page.getByText(state, { exact: true }).first()).toBeVisible({ timeout: 15_000 });
    }

    // And the nodes themselves, grouped into stages. `Java Core` is the first node of the first
    // stage of roadmap 2001 — content, so a name rather than a count.
    await expect(page.getByText('Java Core').first()).toBeVisible();
  });
});
