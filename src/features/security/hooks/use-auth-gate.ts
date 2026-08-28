'use client';

import { useCallback } from 'react';
import { requestSignIn } from '@/core/api/axios';
import { useIsGuest } from '../components/session-presence';

/**
 * Wrap an action so a guest is invited to sign in instead of performing it.
 *
 * THE BELT TO THE TRANSPORT'S BRACES. `core/api/axios` already stops any write a guest attempts
 * and raises the same prompt, so nothing here is load-bearing for correctness. What it buys is
 * the moment BEFORE the failure: an action that opens an editor, expands a comment thread or
 * toggles local state would otherwise run its UI half, and only the request behind it would be
 * refused — leaving an open composer a guest cannot submit from.
 *
 * Use it on controls whose first effect is visible; leave the rest to the interceptor.
 */
export function useAuthGate() {
  const isGuest = useIsGuest();

  const guard = useCallback(
    <A extends unknown[]>(action: (...args: A) => void) =>
      (...args: A) => {
        if (isGuest) {
          requestSignIn();
          return;
        }
        action(...args);
      },
    [isGuest]
  );

  return { isGuest, guard };
}
