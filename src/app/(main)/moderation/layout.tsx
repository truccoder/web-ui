import { pageMetadata } from '@/core/i18n/server';

/**
 * Carries this route's browser-tab title and nothing else — `page.tsx` is a client component and
 * cannot export `metadata` itself. The pattern is written out once in `core/i18n/server.ts`.
 *
 * THE SEVENTH ROUTE THAT PATTERN MISSED, alongside the six under `/settings`. `/moderation` is
 * where a reader is sent to read why their post was removed and to appeal it — reached from the
 * rejection notice on a permalink and from `/profile` → `Tài khoản` — and until now that page
 * reported the root layout's bare `Elite Nexus`.
 */
export const generateMetadata = () => pageMetadata((m) => m.moderationMine.title);

export default function MyModerationLayout({ children }: { children: React.ReactNode }) {
  return children;
}
