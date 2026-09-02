'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Skeleton } from '@/shared/components';
import { useFeedReturnHref, useResolveMyLatestPostId } from '@/features/newsfeed';
import { useMyProfile } from '@/features/security';

/**
 * `/posts/new` — the landing pad the composer bounces off on its way to a fresh post's permalink.
 *
 * WHY A ROUTE AND NOT JUST `router.push` FROM THE COMPOSER. `POST /v1/api/posts` returns no id
 * (backend debt B39), so the id has to be read back from `GET /v1/api/users/{me}/posts` — a
 * network round-trip. Doing that lookup on the feed page and pushing only once it resolved left
 * the author staring at the feed for a few hundred milliseconds, and a `router.push` fired from
 * that late async callback did not leave a clean history entry: pressing Back from the new post
 * did not return to the exact feed tab they posted from.
 *
 * So the composer navigates HERE synchronously the moment the post is accepted — one clean history
 * entry from `/newsfeed?tab=<x>` — and this page does the lookup and **replaces** itself with the
 * real permalink. Back from `/posts/{id}` then lands on the feed tab, with `/posts/new` spent.
 *
 * A static segment, so it wins over `[id]` for this exact path (Next resolves literals before
 * templates — the same reason `/posts/public` is a feed and not a post whose id is "public").
 */

/** How many times to re-ask before giving up — the post was just accepted, so an empty list is a
 *  transient read, not the real answer. */
const MAX_ATTEMPTS = 5;
const RETRY_MS = 400;

export default function NewPostRedirectPage() {
  const router = useRouter();
  const resolveMyLatestPostId = useResolveMyLatestPostId();
  // Where to go if the lookup never lands — the feed column they posted from, same as the
  // permalink's own `← Về bảng tin`.
  const backHref = useFeedReturnHref();
  // The lookup needs the signed-in user's id; `useResolveMyLatestPostId` returns `undefined` on
  // the spot until the profile query has resolved, so wait for it rather than treat that as
  // "no post".
  const { data: profile } = useMyProfile();
  const done = useRef(false);

  useEffect(() => {
    if (done.current || profile?.id === undefined) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const attempt = (n: number) => {
      void resolveMyLatestPostId().then((postId) => {
        if (cancelled) return;
        if (postId !== undefined) {
          done.current = true;
          router.replace(`/posts/${postId}?new=1`);
        } else if (n < MAX_ATTEMPTS) {
          timer = setTimeout(() => attempt(n + 1), RETRY_MS);
        } else {
          done.current = true;
          router.replace(backHref);
        }
      });
    };

    attempt(1);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [resolveMyLatestPostId, router, backHref, profile?.id]);

  return (
    <div className="flex flex-col gap-[var(--nx-space-block)]">
      <Card>
        <Skeleton lines={4} />
      </Card>
    </div>
  );
}
