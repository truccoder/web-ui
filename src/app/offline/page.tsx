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
      </div>
    </main>
  );
}
