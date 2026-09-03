import type { Page } from '@playwright/test';

/**
 * WAIT FOR A PAGE TO BE WORTH MEASURING — and specifically NOT by waiting for the network.
 *
 * ── The thing this file exists to stop you doing ─────────────────────────────────────────────
 *
 * `page.waitForLoadState('networkidle')` **can never resolve on a signed-in route of this app**,
 * and it will burn a full test timeout every time. Measured while building the P4 gates: twelve
 * accessibility tests failed with `Test timeout of 30000ms exceeded` at the `networkidle` line,
 * on twelve different screens, none of which had an accessibility problem at all.
 *
 * The reason is in `(main)/shell.tsx` and it is deliberate, not a leak. The signed-in shell holds
 * two connections open for the whole session, by design and with the reasons written down:
 *
 *   · `useNotificationStream()` — one SSE connection to `/notifications/stream`, mounted on the
 *     shell rather than on the bell "because the stream refreshes the notifications LIST as well
 *     as the badge". An `EventSource` never completes; that is what it is for.
 *   · `ChatClientProvider` — one Stream websocket, mounted shell-wide "because the dock's unread
 *     badge has to be right on every page".
 *
 * Two never-closing connections mean the network is never idle for 500ms, on any page, ever. So
 * `networkidle` is not flaky here — it is unreachable, and any future test that reaches for it
 * will look like a broken feature rather than a broken wait.
 *
 * ── What to wait for instead ─────────────────────────────────────────────────────────────────
 *
 * The two things that actually move a measurement: web fonts swapping in, and the frame after
 * React has committed. Fonts matter most for the screenshots — `next/font` serves Geist, and a
 * shot taken mid-swap captures fallback metrics, which is a diff on every single run in a file
 * whose entire job is that a diff means something.
 */
export async function settle(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready;
    // Two frames: one for React's commit, one for the style/layout it triggers.
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}
