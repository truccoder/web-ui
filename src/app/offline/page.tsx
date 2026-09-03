import type { Metadata } from 'next';

/**
 * The page the service worker serves when a navigation cannot reach the network.
 *
 * IT WAS MISSING, AND THAT DID NOT JUST BREAK THE FALLBACK — IT BROKE THE WHOLE WORKER.
 * `public/sw.js` precaches `['/', '/offline']` with `cache.addAll`, which rejects as a unit if
 * any one request fails, inside `event.waitUntil(install)`. A 404 on this route therefore failed
 * the install, so the worker never activated and nothing was ever cached: the app had no offline
 * capability at all, and the only trace was one `GET /offline 404` in the dev log.
 *
 * Two properties this page must keep:
 *
 *  - **Reachable while signed out.** The worker installs on first visit, which is usually before
 *    anyone has logged in. `middleware.ts` lists it under `alwaysAccessiblePaths` for that
 *    reason; drop it from there and `addAll` caches a redirect to `/login` under this key.
 *  - **No data, no client hooks.** It renders when the network is gone, so anything that fetches
 *    would render an error inside the error page. It is deliberately a server component with no
 *    imports beyond this file.
 *
 * Styling is inline on tokens rather than through `shared/` primitives for the same reason the
 * page has no hooks: the fewer modules it pulls in, the smaller the bundle the worker has to
 * have cached for this page to be the thing that appears.
 */
export const metadata: Metadata = {
  title: 'Không có kết nối · Elite Nexus',
};

export default function OfflinePage() {
  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        padding: 'var(--nx-space-region)',
        background: 'var(--nx-surface-page)',
        color: 'var(--nx-text-primary)',
      }}
    >
      <div
        style={{
          maxWidth: '38ch',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--nx-space-element)',
          textAlign: 'center',
        }}
      >
        <span
          aria-hidden
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-nx-title)',
            color: 'var(--nx-text-faint)',
          }}
        >
          &gt;_
        </span>

        <h1
          style={{
            margin: 0,
            fontSize: 'var(--text-nx-title)',
            lineHeight: 1.25,
            fontWeight: 600,
            letterSpacing: '-0.015em',
          }}
        >
          Không có kết nối
        </h1>

        {/* Says what is true and what to do, and does not apologise. The distinction matters
            here: pages already visited ARE readable offline — the worker caches every GET it
            has served — so "nothing works" would be wrong as well as unhelpful. */}
        <p style={{ margin: 0, color: 'var(--nx-text-secondary)', lineHeight: 1.6 }}>
          Thiết bị đang mất mạng. Những trang bạn đã mở trước đó vẫn đọc được; phần còn lại sẽ quay
          lại ngay khi có kết nối.
        </p>

        {/*
          A WAY OUT, AND IT HAD NONE — report §3.10 (I002). The screen said what was true and then
          stopped: `actions: []`, measured. Every other error surface in the product ends in
          something to press, and this is the one a reader reaches by accident rather than by
          clicking, so it is the one that most needs to say what to do next.

          A PLAIN LINK, NOT A BUTTON, and that is the constraint above being honoured rather than
          worked around. This page must stay a server component with no client hooks — an
          `onClick` retry would make it a client component and grow the very bundle the service
          worker has to have cached for this page to be the thing that appears at all.

          Navigating re-attempts the network by itself, so the anchor IS the retry. It points at
          `/`, which `public/sw.js` precaches alongside this page: online it lands on the feed,
          still offline it comes back here — which is the correct answer to "try again", not a
          failure of it.
        */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- a FULL navigation is the
            point. `next/link` does a client-side transition, which the router can satisfy without
            re-attempting the document fetch — and re-attempting the network IS what this control
            is for. It also keeps this page's import list empty, which the note at the top of the
            file explains is what makes it small enough to be worth precaching. */}
        <a
          href="/"
          style={{
            marginTop: 'var(--nx-space-tight)',
            alignSelf: 'center',
            display: 'inline-flex',
            alignItems: 'center',
            padding: 'var(--nx-space-tight) var(--nx-space-pad)',
            borderRadius: 'var(--radius-nx-sm)',
            border: '1px solid var(--nx-border-default)',
            color: 'var(--nx-text-primary)',
            fontSize: 'var(--text-nx-ui)',
            fontWeight: 500,
            textDecoration: 'none',
          }}
        >
          Thử lại
        </a>
      </div>
    </main>
  );
}
