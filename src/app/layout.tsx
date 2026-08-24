import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import { Geist, Geist_Mono } from 'next/font/google';
import { Providers } from '@/core/providers';
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale } from '@/core/i18n/locale';
import { ServiceWorkerRegister } from '@/core/pwa/service-worker-register';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Elite Nexus',
  description: 'Connect, share, and grow your social network',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Elite Nexus',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  /**
   * Mirrors `--nx-surface-page` in each theme — gray-100 light, gray-950 dark. Hardcoded
   * because `viewport` is serialised at build time and cannot read a CSS custom property;
   * the token names are recorded here so a token change has one place to follow.
   *
   * WAS `#000000`, which is not a surface this design system contains. Pure black painted the
   * browser chrome a shade darker than the app's own ground, so the seam between the OS chrome
   * and the page was visible on every mobile load.
   */
  themeColor: [
    // eslint-disable-next-line no-restricted-syntax -- build-time metadata, see note above
    { media: '(prefers-color-scheme: light)', color: '#eceef0' },
    // eslint-disable-next-line no-restricted-syntax -- build-time metadata, see note above
    { media: '(prefers-color-scheme: dark)', color: '#101820' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // THE ONE PLACE THE LOCALE IS DISCOVERED (P5.3). Reading it here — on the server, before any
  // markup exists — is what makes SSR and hydration agree; see `core/i18n/locale.ts` for the bug
  // this replaced. `cookies()` opts the tree out of static rendering, which costs nothing here:
  // every route is already behind the session check in `middleware.ts` and renders per request.
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;

  return (
    // suppressHydrationWarning: next-themes stamps data-theme on <html> before React
    // hydrates, so the server markup and first client render differ by that attribute.
    <html
      // Was hardcoded `en` while the app defaulted to `vi`, so screen readers and translation
      // prompts were told the wrong language on every page. Now it tracks the real locale.
      lang={locale}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers initialLocale={locale}>{children}</Providers>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
