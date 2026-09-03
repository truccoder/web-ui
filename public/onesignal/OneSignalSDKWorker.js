/**
 * OneSignal's web-push service worker, scoped to `/onesignal/` so it never collides with the
 * app's own `public/sw.js` (which owns the root scope). `useWebPush` points the SDK here via
 * `serviceWorkerParam.scope` + `serviceWorkerPath`.
 *
 * It is intentionally one line: the real worker code is the versioned SDK bundle on OneSignal's
 * CDN. Pinned to the v16 major.
 */
importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');
