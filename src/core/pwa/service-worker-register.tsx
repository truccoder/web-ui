'use client';

import { useEffect } from 'react';

/**
 * Registers the offline worker — in production, and only there.
 *
 * IT REGISTERED EVERYWHERE UNTIL IT BROKE DEVELOPMENT, and the failure is worth writing down
 * because nothing about it looks like a caching bug from the inside. `public/sw.js` serves
 * `/_next/static/` **cache-first**, on the stated claim that build output is "content-addressed or
 * versioned". That is true of `next build`, whose chunk filenames carry a content hash — and false
 * of `next dev`, where Turbopack keeps a stable name (`src_core_04bqgiq._.js`) and rewrites what is
 * behind it on every edit. So the worker pinned the first copy of every chunk it ever saw and kept
 * serving it after the file changed.
 *
 * WHAT THAT LOOKS LIKE ON SCREEN, both symptoms seen on 25/08 and neither pointing here:
 *
 *  - `Module … useQueries.js was instantiated because it was required from … use-reputation.ts,
 *    but the module factory is not available` — a fresh chunk asking for a module that only exists
 *    in the stale copy of another chunk, after an import was deleted in an edit.
 *  - `Encountered a script tag while rendering React component`, blamed on `RootLayout` → the
 *    `Providers` line — a fresh HTML document (navigation is network-first) hydrating against a
 *    module graph assembled from stale chunks.
 *
 * SO DEVELOPMENT UNREGISTERS RATHER THAN JUST DECLINING TO REGISTER. Anyone who already ran the
 * app once has a worker installed and a cache full of poisoned chunks; a guard that only skips
 * `register()` would leave every one of those machines broken until somebody found the checkbox in
 * devtools. This tears the installation down and drops the caches it owns, so the fix arrives by
 * reloading the page — which is exactly what a person hitting the bug is already doing.
 *
 * ONLY THIS APP'S CACHES ARE DELETED. `caches.keys()` is shared per origin, and on a dev machine
 * `localhost:3000` is not always this project alone.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    if (process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(console.error);
      return;
    }

    void navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => Promise.all(registrations.map((r) => r.unregister())))
      .catch(() => {
        // A browser that refuses the enumeration (private mode, a policy) simply has no worker to
        // remove; there is nothing to report and nothing the reader could do about it.
      });

    void caches
      ?.keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key.startsWith('elite-nexus')).map((key) => caches.delete(key))
        )
      )
      .catch(() => {});
  }, []);

  return null;
}
