import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from './locale';
import { en, type Messages } from './translations/en';
import { vi } from './translations/vi';

/**
 * Reading the translations from the SERVER side of the RSC boundary.
 *
 * `useT` is a hook on a client context, so a server component cannot call it — and two things in
 * this app must be translated without one: a route's `<title>`, and `not-found.tsx`, which has no
 * reason to be a client component and every reason to carry its own title.
 *
 * THE PROBLEM `pageMetadata` SOLVES: every route in the product rendered the same tab title.
 * `metadata` may only be exported from a server component, and 29 of the 33 pages here carry
 * `'use client'` — they hold state, run queries and read the router — so not one of them could
 * export it. The root layout's `title: 'Elite Nexus'` was therefore the title of the newsfeed,
 * the moderation queue, a book and someone's profile alike. Two windows open side by side during
 * a demo are two identical tabs, and a bookmark records nothing about what was bookmarked.
 *
 * THE FIX IS A LAYOUT PER ROUTE, NOT A PAGE SPLIT. The other way to do this is to make each
 * `page.tsx` a server component that exports `metadata` and renders a client `*-view.tsx`
 * alongside it — two files and a moved component per route, touching every page in the product.
 * A segment's `layout.tsx` may export metadata too, and a layout that returns its children
 * unchanged costs one small file and changes no existing line. Those layouts are near-identical
 * by design; they are a declaration, not logic.
 *
 * THE LOCALE COMES FROM THE COOKIE, so a title is in the reader's language like everything else.
 * Same cookie, same guard and same default as the root layout — see `locale.ts` for why the
 * locale lives in a cookie at all. `cookies()` opts the segment out of static rendering, which
 * costs nothing here: every route is already dynamic (the middleware gates them all, and the root
 * layout reads this same cookie on every request).
 *
 * NOT EXPORTED FROM `core/i18n/index.ts`, DELIBERATELY. That barrel re-exports `context.tsx`,
 * which is a client module; importing this through it would drag the provider into server render
 * for a string. The root layout imports `./locale` directly for exactly this reason, and callers
 * of this file import `@/core/i18n/server` the same way.
 */

/** The same map `context.tsx` holds for the client. Two lines, two boundaries, no shared module. */
const bundles: Record<Locale, Messages> = { en, vi };

/**
 * The bundle for the request's locale.
 *
 * RETURNS THE WHOLE BUNDLE RATHER THAN A `t()`. A server component reaches for a handful of
 * strings it names in source, so `messages.notFound.title` is both shorter than a call and
 * type-checked — where `t('notFound.title')` takes a `string` and answers with the path itself
 * when the key is wrong. That fallback is right in a component (a visible key beats a blank
 * screen) and pointless here, where every key is written by hand next to its use.
 *
 * No interpolation either: `${}` substitution belongs to the strings components render, and
 * nothing on the server side of this app has needed it.
 */
export async function getMessages(): Promise<Messages> {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  return bundles[isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE];
}

/**
 * `<Page> · Elite Nexus` — the suffix convention `offline/page.tsx` already set.
 *
 * The product name goes last so the distinguishing half survives the truncation a narrow tab
 * applies from the right.
 *
 * A PICKER FUNCTION, NOT A DOT-PATH STRING, for the reason given on `getMessages`: this takes
 * `(m) => m.newsfeed.title` and lets `tsc` reject a key that does not exist. A wrong title is
 * invisible until someone looks at the tab, which is far too late to find out.
 */
export async function pageMetadata(pick: (messages: Messages) => string): Promise<Metadata> {
  const messages = await getMessages();
  return { title: `${pick(messages)} · ${messages.app.name}` };
}
