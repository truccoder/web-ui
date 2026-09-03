import { expect, type Page } from '@playwright/test';

/**
 * Finds a real post and a real handle IN THE RUNNING APP, instead of naming ones from a seed.
 *
 * WHY THIS FILE EXISTS. The suite used to address `/posts/5055` and `/u/backend_truc_anh` by
 * hand. The database was re-seeded on 02/09 — 501 accounts on `@elitenexus.test`, post ids in the
 * 102xxx range — and every one of those tests went red at once, in the least informative way
 * available: a page that renders its own "không khả dụng" empty state, so the failure reads as
 * "the permalink is broken" rather than "this post does not exist any more". Four specs failed on
 * data, none on behaviour.
 *
 * A hardcoded id is a claim about a database that no test controls. What each of those tests
 * actually means is "SOME post opens its thread", "SOME profile shows a score" — so they should
 * ask the app which one, and they can: the public feed is the one list every project here can
 * read, guest included.
 *
 * IT READS THE RENDERED LINKS RATHER THAN CALLING THE API, so it also stays inside the suite's
 * read-only rule and needs no token of its own.
 */

/** The public post column — the one feed a signed-out browser is allowed to read. */
async function openPublicFeed(page: Page) {
  await page.goto('/newsfeed?tab=posts');
  await expect(page.locator('a[href^="/posts/"]').first()).toBeVisible({ timeout: 20_000 });
}

/**
 * The permalink of the first post in the public feed, e.g. `/posts/102999`.
 *
 * Every card carries this on its timestamp, so a post always has one; `first()` is whichever the
 * feed ranked highest today, which is all any caller needs.
 */
export async function firstPostHref(page: Page): Promise<string> {
  await openPublicFeed(page);
  const href = await page.locator('a[href^="/posts/"]').first().getAttribute('href');
  expect(href, 'the public feed rendered no post permalink').toBeTruthy();
  return href!;
}

/**
 * The profile path of some author with posts in the public feed, e.g. `/u/nguyenvanquan`.
 *
 * THE FEED CARRIES `authorUsername` NOW (backend B13), which is what makes this possible — the
 * guest spec's note that "the feed payload carries no author username" predates it, and the card
 * has linked the author's name ever since.
 */
export async function firstProfileHref(page: Page): Promise<string> {
  await openPublicFeed(page);
  const href = await page.locator('a[href^="/u/"]').first().getAttribute('href');
  expect(href, 'the public feed rendered no author link').toBeTruthy();
  return href!;
}

/** The handle out of a `/u/{handle}` path, for tests that assert the `@handle` line. */
export function handleOf(profileHref: string): string {
  return decodeURIComponent(profileHref.replace(/^\/u\//, ''));
}
