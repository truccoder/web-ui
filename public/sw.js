/**
 * ---------------------------------------------------------------------------------------------
 * WHAT THIS WORKER IS ALLOWED TO TOUCH, AND WHY THE ANSWER IS "ALMOST NOTHING".
 * ---------------------------------------------------------------------------------------------
 *
 * The previous version had one `fetch` handler for every GET in the app: fetch it, clone it, put
 * it in the cache. No origin filter, no status filter, no request-type filter. That is a blanket,
 * and a blanket over this app catches three things it must not.
 *
 * 1. THE BACKEND. `core/api/axios` sends every API call with an `Authorization` header, and
 *    `GET http://localhost:8080/v1/api/users/me/profile` is a GET like any other. Its response
 *    was being written into `caches`. `useClearSession` clears localStorage, the cookies and the
 *    React Query cache on logout — with a comment saying the next user on this browser must not
 *    read the previous one's data — and it could not clear this one, because nothing knew it was
 *    here. A shared machine plus one offline reload was enough to hand over somebody's profile.
 *
 * 2. FAILURES. `response.ok` was never checked, so a transient 500 became the cached answer for
 *    that URL until the next successful fetch replaced it.
 *
 * 3. EVERYTHING THAT IS NOT A PAGE. `caches.match('/offline')` was the fallback for every failed
 *    GET, so a broken image request resolved to an HTML document.
 *
 * So the rule is inverted: this worker passes requests through untouched unless they are named
 * below. Anything added to the app tomorrow — a new API host, a websocket, an upload — is
 * outside by default, which is the only way a list like this stays correct without being audited.
 *
 * WHAT IT STILL DOES, because `app/offline/page.tsx` promises it out loud ("những trang bạn đã
 * mở trước đó vẫn đọc được"): same-origin page navigations are cached as they are visited, and
 * served back when the network is gone.
 *
 * THOSE PAGES ARE CHROME, NOT DATA. Every screen in `(main)` is a client component that fetches
 * through React Query after hydration, so the HTML holds skeletons. The one thing it does carry
 * is session PRESENCE — `(main)/layout.tsx` reads the `session` cookie on the server to pick the
 * signed-in or guest shell — which means the same URL has two valid documents and this cache is
 * keyed on the URL alone. That is why the `message` handler at the bottom exists and why
 * `useClearSession` calls it: on logout the cache is dropped whole, rather than left holding the
 * previous session's chrome.
 */

// v2: v1 was written by the blanket handler described above and may hold API responses from a
// signed-in session. The `activate` handler below deletes every cache whose name is not this one,
// so bumping the name is the migration — no separate cleanup path is needed.
//
// v3: the app icons under `/icons/` were replaced in place — the placeholders became the real
// brand mark. `STATIC_PREFIXES` serves that path cache-first on the claim that everything under
// it is "content-addressed or versioned", which those filenames are not, so an existing install
// would have kept serving the blank placeholder forever. Bumping the name is the version.
//
// v4: THE BUMP IS THE ONLY WAY OUT FOR A MACHINE THAT IS ALREADY BROKEN. This worker used to be
// registered in development too, where the claim above is false (see `STATIC_PREFIXES`), so every
// dev browser holds a v3 cache full of Turbopack chunks pinned to whatever the source looked like
// when each was first fetched. `core/pwa/service-worker-register.tsx` now tears the installation
// down — but it is a React effect, and the symptom of a poisoned chunk graph is that React never
// mounts, so the repair could not reach the machines that needed it. `activate` runs regardless of
// what the page does, and it deletes every cache whose name is not this one; renaming is therefore
// what unblocks the load that then runs the teardown.
const CACHE_NAME = 'elite-nexus-v4';

const OFFLINE_URL = '/offline';

/**
 * `cache.addAll` rejects as a unit inside `event.waitUntil(install)`, so a 404 on either of these
 * fails the install and the worker never activates. `app/offline/page.tsx` records the outing
 * that cost — do not add a URL here without checking it answers 200 while logged out.
 */
const PRECACHE_URLS = ['/', OFFLINE_URL];

/**
 * Build output and app icons: content-addressed or versioned, so cache-first is safe.
 *
 * "CONTENT-ADDRESSED" IS A PRODUCTION FACT AND A DEVELOPMENT FALSEHOOD, which is why this worker
 * is only registered in production — see `core/pwa/service-worker-register.tsx`, which also tears
 * down any installation it finds on a dev machine. `next build` writes chunk names with a content
 * hash; `next dev` under Turbopack keeps a stable name (`src_core_04bqgiq._.js`) and changes what
 * is behind it on every edit, so cache-first here pins the first copy of every chunk forever and
 * the app slowly assembles itself out of modules from different builds.
 */
const STATIC_PREFIXES = ['/_next/static/', '/icons/'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
  );
  self.clients.claim();
});

/**
 * `basic` means same-origin and fully readable. An `opaque` cross-origin response has status 0
 * and cannot be inspected, and caching one stores something this worker cannot reason about;
 * `ok` keeps 4xx and 5xx out. Both conditions, every time — there is no branch here that may
 * store a response without passing this.
 */
function isCacheable(response) {
  return response.ok && response.type === 'basic';
}

/**
 * Fire-and-forget: the clone is taken synchronously (a body may only be read once) but the write
 * is not awaited, so caching never delays the response the page is waiting on.
 */
function cachePut(request, response) {
  if (!isCacheable(response)) return;
  const clone = response.clone();
  caches
    .open(CACHE_NAME)
    .then((cache) => cache.put(request, clone))
    .catch(() => {
      // A full quota or a private-mode restriction must not turn into a failed navigation.
    });
}

/** Pages: always prefer the live one, fall back to what was read before, then to `/offline`. */
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    cachePut(request, response);
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    const offline = await caches.match(OFFLINE_URL);
    if (offline) return offline;
    return Response.error();
  }
}

/** Static assets: serve from cache when present, otherwise fetch and keep it. */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  cachePut(request, response);
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  /**
   * THE ORIGIN CHECK IS THE WHOLE FIX. The backend, MinIO and every crawled thumbnail live on
   * other origins, and nothing on another origin is this worker's business — least of all the
   * API, which is the only place authenticated data travels.
   */
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  if (STATIC_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) {
    event.respondWith(cacheFirst(request));
    return;
  }

  /**
   * Everything else same-origin — RSC payloads for client-side navigations, `/manifest.webmanifest`,
   * anything a future route adds — is left to the browser. Not responding at all is different
   * from responding with a network fetch: the request never enters this worker's control, so
   * there is nothing here to get wrong.
   */
});

/**
 * Logout, forwarded from `core/pwa/purge-offline-cache`.
 *
 * `useClearSession` drops the tokens, the cookies and the React Query cache so that the next
 * person on this browser starts from nothing. This cache is the fourth thing it has to drop:
 * the cached documents are keyed on URL and carry the signed-in chrome, so leaving them means an
 * offline reload after logout renders the previous session's shell.
 */
self.addEventListener('message', (event) => {
  if (event.data?.type !== 'purge-cache') return;
  /**
   * Deleted and re-seeded rather than simply deleted. `install` is what normally fills the
   * precache, and it does not run again until the worker itself changes — so dropping the cache
   * outright would leave this browser with no `/offline` page at all until the next deploy, and
   * logging out is not a reason to lose offline capability. Re-adding the two precache URLs
   * restores exactly the state a fresh install produces, holding nothing that was visited
   * while signed in.
   */
  event.waitUntil(
    caches
      .delete(CACHE_NAME)
      .then(() => caches.open(CACHE_NAME))
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch(() => {
        // Offline at logout: the purge above still happened, which is the part that matters.
      })
  );
});
