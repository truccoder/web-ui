import { pageMetadata } from '@/core/i18n/server';

/**
 * Carries this route's browser-tab title and nothing else — `page.tsx` is a client
 * component and cannot export `metadata` itself. The pattern, and why it is a layout rather
 * than a page split, is written out once in `core/i18n/server.ts`.
 */
export const generateMetadata = () => pageMetadata((m) => m.knowledge.title);

export default function KnowledgeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
