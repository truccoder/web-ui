'use client';

import { useMutation } from '@tanstack/react-query';
import { mediaApi } from '../api';

/**
 * `POST /v1/api/media`.
 *
 * NO QUERY KEY AND NO CACHE PATCH, WHICH IS WHY THIS FEATURE HAS NO `keys.ts`. The store is
 * write-only from the client's side: there is no endpoint that lists what you have uploaded, and
 * nothing to invalidate — the URLs it returns become someone else's state (a post's `images`, a
 * profile's `coverImageUrl`), and that owner's mutation is what updates a cache.
 *
 * SO THE CALLER OWNS THE SECOND STEP. An upload on its own changes nothing a reader can see;
 * `ProfileCoverControl` uploads and then calls `useUpdateProfile`, because until that second call
 * lands the image is an object in a bucket that no row points at.
 */
export function useUploadMedia() {
  return useMutation({
    mutationFn: (files: File[]) => mediaApi.upload(files),
  });
}
