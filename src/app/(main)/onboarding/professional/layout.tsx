import { pageMetadata } from '@/core/i18n/server';

/**
 * The wizard's browser-tab title — report §3.9 (G001).
 *
 * `/onboarding/professional` was one of five routes with no metadata of its own, and the only one
 * of the five that is a SCREEN: the other four are transient callbacks (`magic-login`, the OAuth
 * and GitHub returns) and a pure `redirect()` (`/trending`, whose own file explains that a route
 * which never renders has no title to set). This one is a four-step form that people leave and
 * come back to, so it was reporting the root layout's bare `Elite Nexus`.
 *
 * That is the exact failure `core/i18n/server.ts` exists to prevent and that `qa-report.md`'s Q9
 * closed across the `/settings` hub. The argument `settings/layout.tsx` makes for that hub — "a
 * person has to be able to bookmark 'my tokens'" — applies harder here: a wizard is the one screen
 * a reader is most likely to abandon with the tab still open.
 */
export const generateMetadata = () => pageMetadata((m) => m.onboarding.professional.pageTitle);

export default function OnboardingProfessionalLayout({ children }: { children: React.ReactNode }) {
  return children;
}
