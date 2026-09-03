/**
 * Drop everything the service worker cached for this browser.
 *
 * WHY A SESSION CONCERN REACHES INTO THE PWA LAYER. `public/sw.js` caches same-origin page
 * documents so a reader who goes offline can still open what they already read. Those documents
 * are keyed on URL alone, but they are not identical for everyone: `(main)/layout.tsx` reads the
 * `session` cookie on the server and renders either the signed-in shell or the guest one. So a
 * cache filled while signed in describes a session that no longer exists the moment someone logs
 * out, and an offline reload would draw the previous person's chrome.
 *
 * `features/security`'s `useClearSession` already drops the tokens, both cookies and the React
 * Query cache for exactly this reason. This is the fourth store it has to drop, and the only one
 * that does not live in the page — hence a message rather than a function call.
 *
 * IT IS CHROME, NOT DATA, and the distinction is worth keeping straight: no API response is in
 * that cache (`sw.js` refuses every cross-origin request, and the backend is a different origin),
 * so this is not what stands between one user and another's data. It is what stops the app from
 * lying about who is signed in.
 *
 * FIRE AND FORGET, AND IT MUST STAY THAT WAY. Logout has to complete on a browser with no worker
 * registered, no worker controlling this page yet, and no `serviceWorker` in `navigator` at all —
 * so every one of those is a silent no-op rather than a branch the caller has to handle.
 */
export function purgeOfflineCache() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  // `controller` is null on the very first load, before the freshly-registered worker has claimed
  // the page. There is nothing to purge in that case: the cache is whatever `install` precached.
  navigator.serviceWorker.controller?.postMessage({ type: 'purge-cache' });
}
