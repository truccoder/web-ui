import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind classes, letting later ones win over earlier conflicts.
 *
 * Duplicated from the legacy `src/lib/utils.ts` rather than imported from it: nothing
 * under `shared/` may depend on `lib/`, which is being dismantled. The legacy copy dies
 * with `src/lib/`.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
