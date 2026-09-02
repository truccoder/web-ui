import { test, expect, type Page } from '@playwright/test';

/**
 * Act 4: the admin surfaces — the moderation queue, the appeal, and the skill approval that
 * closes the thesis's loop. This is the run's ONLY project on an admin session; see the two
 * shells and the middleware split in `playwright.config.ts`.
 *
 * ── EVERY TEST HERE IS READ-ONLY, AND ON THIS SCREEN THAT RULE HAS TEETH. ──────────────────────
 *
 * A `Duyệt`/`Từ chối` on the post queue is not a status toggle: rejecting calls
 * `recordViolation`, two violations ban the author for seven days, and that ban blocks their
 * login (`api/moderation.ts` spells it out). Approving a skill moves an Elite Score across a level
 * threshold. Deciding an appeal can unlock or re-lock an account. Any one of those, run against
 * the demo database, quietly rewrites a number `docs/demo-script.md` quotes to the presenter.
 *
 * So this file opens every surface and reads it, and clicks NOTHING that mutates. The buttons are
 * asserted to be PRESENT — that is the UI claim worth guarding — never pressed. Where a queue's
 * contents matter, the assertion is "the queue rendered its rows OR its empty state", because both
 * are correct outcomes and a suite anyone can run must not depend on today's seed counts.
 *
 * If these fail at the session step rather than here, the admin credential is the cause — see the
 * password note on `ADMIN_USER` in `accounts.ts`.
 */

/** The five tabs of `/admin/moderation`, in order. The tablist is labelled `Kiểm duyệt`. */
const MODERATION_TABS = ['Hàng chờ', 'Báo cáo', 'Nhật ký quyết định', 'Người bị cấm', 'Khiếu nại'];

/** A tab panel has settled when it shows either real content or its own empty state. */
async function panelSettled(page: Page, contentOrEmpty: ReturnType<Page['getByText']>) {
  await expect(contentOrEmpty).toBeVisible({ timeout: 15_000 });
}

test.describe('admin · moderation', () => {
  test('the admin lands in the admin shell, not the main one', async ({ page }) => {
    await page.goto('/admin/moderation');

    // The (admin) shell names its nav `Quản trị kiểm duyệt`; the (main) shell names its
    // `Điều hướng chính`. Seeing the first and not the second proves the middleware routed this
    // session into the right shell rather than the reader's.
    await expect(page.getByRole('navigation', { name: 'Quản trị kiểm duyệt' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Điều hướng chính' })).toHaveCount(0);

    await expect(page.getByRole('heading', { name: 'Kiểm duyệt' })).toBeVisible();
  });

  test('all five tabs are present', async ({ page }) => {
    await page.goto('/admin/moderation');
    const tabs = page.getByRole('tablist', { name: 'Kiểm duyệt' });
    for (const label of MODERATION_TABS) {
      await expect(tabs.getByRole('tab', { name: label })).toBeVisible();
    }
  });

  test('the queue renders rows with decision controls, or an empty state', async ({ page }) => {
    await page.goto('/admin/moderation');

    // The queue is the default tab. Either it has posts — each with an approve and a reject
    // button — or it says there is nothing to review. Both are correct; a spinner that never
    // resolves is not.
    const approve = page.getByRole('button', { name: 'Duyệt' });
    const empty = page.getByText('Không có gì cần duyệt');
    await panelSettled(page, approve.first().or(empty));

    // If there ARE rows, the reject control is there too — the pair is the point of the queue.
    // Asserted without pressing either; see the file note.
    if ((await approve.count()) > 0) {
      await expect(page.getByRole('button', { name: 'Từ chối' }).first()).toBeVisible();
    }
  });

  test('the reports tab reads as a signal, not a task list', async ({ page }) => {
    // This is the tab added at P0-3 — the read side of `POST /moderation/reports`, which had none
    // before. Its defining property is that it CANNOT decide anything, and the copy says so.
    await page.goto('/admin/moderation');
    await page
      .getByRole('tablist', { name: 'Kiểm duyệt' })
      .getByRole('tab', { name: 'Báo cáo' })
      .click();

    await expect(
      page.getByText('Báo cáo là tín hiệu, không phải danh sách việc', { exact: false })
    ).toBeVisible({ timeout: 15_000 });

    // No approve/reject on this tab — a report is not decided here, it points at a post that is.
    await expect(page.getByRole('button', { name: 'Duyệt' })).toHaveCount(0);
  });

  test('the appeals tab loads its queue', async ({ page }) => {
    await page.goto('/admin/moderation');
    await page
      .getByRole('tablist', { name: 'Kiểm duyệt' })
      .getByRole('tab', { name: 'Khiếu nại' })
      .click();

    // Rows carry `Chấp nhận`/`Từ chối`; an empty queue says so. Either settles the panel. The
    // demo script expects one pending appeal here, but that is a number this suite must not pin.
    const decide = page.getByRole('button', { name: 'Chấp nhận' });
    const empty = page.getByText('Không có khiếu nại nào ở trạng thái này');
    await panelSettled(page, decide.first().or(empty));
  });

  test('the banned-users tab lists history, or says there is none', async ({ page }) => {
    await page.goto('/admin/moderation');
    await page
      .getByRole('tablist', { name: 'Kiểm duyệt' })
      .getByRole('tab', { name: 'Người bị cấm' })
      .click();

    // Every row states whether the ban is still active — the list is a history, not a
    // currently-banned set (see `banned-users-tab.tsx`). Presence of either state or the empty
    // state is enough.
    const active = page.getByText(/còn|hết hạn/i);
    const empty = page.getByText('Chưa có ai bị cấm');
    await panelSettled(page, active.first().or(empty));
  });
});

test.describe('admin · roadmap', () => {
  test('the skill-verification queue and the authoring surface both render', async ({ page }) => {
    await page.goto('/admin/roadmap');

    // The page carries two sections: the queue that closes the loop, and the authoring forms.
    await expect(page.getByRole('heading', { name: 'Quản lý lộ trình' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Chờ duyệt' })).toBeVisible();

    // The queue itself: rows with a `Duyệt` each, or its empty state. The demo expects a long
    // queue ("48 yêu cầu chờ"), but the assertion is structural — approving here is the single
    // most destructive read-only violation possible, since it is the exact action the demo saves
    // for its finale.
    const approve = page.getByRole('button', { name: 'Duyệt' });
    const empty = page.getByText('Không có yêu cầu nào chờ duyệt');
    await panelSettled(page, approve.first().or(empty));

    // The authoring side is reused from the reader's roadmap list — a track has to be selectable
    // before nodes can be added to it. `Backend cho người mới` is seeded (id 2001); it read
    // `Backend Developer` until the third-generation seed (`V88`) rebuilt the tracks with
    // Vietnamese names.
    await expect(page.getByText('Backend cho người mới').first()).toBeVisible({ timeout: 15_000 });
  });
});
