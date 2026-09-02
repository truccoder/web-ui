'use client';

import { TokenList } from '@/features/knowledge';

/**
 * `/settings/tokens` — personal access tokens for the Obsidian vault client. `TokenList` owns
 * the create dialog (with its mandatory copy-now-you-won't-see-it-again modal) and the
 * WRITE_ONLY vs BIDIRECTIONAL explanation. Was the `Cài đặt` tab of `/knowledge`.
 *
 * NO `Section` WRAPPER — `TokenList` carries its own `<h2>` and its own one-line hint (which names
 * the sync URL the page's description could not), so wrapping it printed "Access token" and "Token
 * truy cập cá nhân" one under the other. Same shape as `/settings/picture`, which renders its
 * component bare for the same reason.
 */
export default function SettingsTokensPage() {
  return <TokenList />;
}
