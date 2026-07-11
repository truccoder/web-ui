// Deterministic (not re-rolled per render) neutral background for a user's default avatar,
// so someone without a profile picture gets a stable "random" color instead of one flat gray.
const NEUTRAL_AVATAR_COLORS = [
  'bg-slate-500',
  'bg-gray-500',
  'bg-zinc-500',
  'bg-neutral-500',
  'bg-stone-500',
];

export function getNeutralAvatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return NEUTRAL_AVATAR_COLORS[Math.abs(hash) % NEUTRAL_AVATAR_COLORS.length];
}
