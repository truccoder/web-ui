'use client';

import './globals.css';

/**
 * The last net: an error thrown by the ROOT LAYOUT ITSELF, or by anything above `app/error.tsx`.
 * When this renders, the root layout is gone — so this file has to supply `<html>` and `<body>`
 * of its own, and it is the one component in the app that must assume **nothing** is available.
 *
 * WHAT IS NOT AVAILABLE HERE, each for a concrete reason:
 *
 *  - `useT` — the `I18nProvider` lives in the root layout that just failed. The copy is
 *    therefore hardcoded, in Vietnamese, matching `offline/page.tsx` which is unreachable by
 *    the provider for the same class of reason.
 *  - `shared/components` — importable in principle, but every one of them is a module this page
 *    would then depend on to render a failure. The markup is inline for the same reason the
 *    offline page's is.
 *  - the dark theme — `next-themes` writes `data-theme` from the root layout's provider tree, so
 *    this page always renders the `:root` (light) token values. Accepted rather than worked
 *    around: re-implementing theme detection in the crash handler is more surface to crash.
 *
 * `globals.css` IS IMPORTED HERE DIRECTLY. The stylesheet arrives with the root layout normally,
 * and that is exactly what has been replaced — without this line the tokens below resolve to
 * nothing and the page renders as unstyled black-on-white. App Router allows a global stylesheet
 * import from any component, and importing the same file twice does not duplicate it in the
 * output.
 *
 * NO `reset()` BUTTON. The prop exists, but if the root layout cannot render, re-rendering it is
 * the operation that just failed; a full reload is the honest offer, so the button is an anchor
 * to the current URL.
 */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return (
    <html lang="vi">
      <body
        style={{
          minHeight: '100dvh',
          display: 'grid',
          placeItems: 'center',
          padding: 'var(--nx-space-region)',
          margin: 0,
          background: 'var(--nx-surface-page)',
          color: 'var(--nx-text-primary)',
        }}
      >
        <main
          style={{
            maxWidth: '42ch',
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
            Ứng dụng gặp sự cố
          </h1>

          <p style={{ margin: 0, color: 'var(--nx-text-secondary)', lineHeight: 1.6 }}>
            Đã có lỗi khiến trang không dựng được. Tải lại thường là đủ; nếu vẫn lỗi, dữ liệu của
            bạn vẫn an toàn trên máy chủ.
          </p>

          {/* An anchor, not a button: this is a reload, and a reload is a navigation. It also
              means the way out still works if hydration is what failed. */}
          <a
            href="/newsfeed"
            style={{
              alignSelf: 'center',
              marginTop: 'var(--nx-space-tight)',
              padding: '8px 12px',
              borderRadius: 'var(--radius-nx-sm)',
              background: 'var(--nx-surface-inverse)',
              color: 'var(--nx-text-inverse)',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            Về bảng tin
          </a>

          {/* The only thread back to the server log — see the note in `app/error.tsx`. */}
          {error.digest && (
            <p
              style={{
                margin: 0,
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-nx-micro)',
                color: 'var(--nx-text-faint)',
              }}
            >
              Mã lỗi: {error.digest}
            </p>
          )}
        </main>
      </body>
    </html>
  );
}
