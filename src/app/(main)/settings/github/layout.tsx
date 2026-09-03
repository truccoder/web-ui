import { pageMetadata } from '@/core/i18n/server';

/**
 * Carries this route's browser-tab title and nothing else — `page.tsx` is a client component and
 * cannot export `metadata` itself. The pattern is written out once in `core/i18n/server.ts`.
 *
 * THE SIX SETTINGS ROUTES WERE THE ONES THAT PATTERN MISSED. Every other route under `(main)` has
 * a layout like this; `/settings/**` had none, so all six reported the root layout's bare
 * `Elite Nexus` — which is the exact failure `core/i18n/server.ts` was written to end, and it
 * lands hardest here: this hub's own layout says "a person should be able to bookmark 'my
 * tokens'", and a bookmark titled `Elite Nexus` records nothing about what was bookmarked.
 *
 * THE TAB NAME IS QUALIFIED WITH THE HUB'S. Alone, `Thông báo` is the title of `/notifications`
 * too — a different destination — and two tabs reading the same word is the confusion this is
 * supposed to remove rather than move.
 */
export const generateMetadata = () =>
  pageMetadata((m) => `${m.settings.tabs.github} · ${m.settings.title}`);

export default function GithubSettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
