import api from '@/core/api/axios';
import type { MediaUploadResponse } from '../types/media';

/**
 * MediaController (`com.socialapp.media`) — one endpoint, the loose-image store.
 *
 * THIS IS B16, AND IT IS THE ENDPOINT THREE OTHER FEATURES WERE WAITING ON. Before it, the whole
 * API had exactly three multipart routes — register, book upload, profile picture — and none of
 * them took a bare image. So a post's `images` array could be read and written but never FILLED
 * except by pasting somebody else's URL, and a profile cover had nowhere to come from at all.
 *
 * THE PART IS NAMED `files` AND IS A LIST, even for one image. `@RequestPart("files")
 * List<MultipartFile>` on the controller: a single file is a list of one, which keeps the composer
 * (many images) and the cover picker (exactly one) on the same call.
 *
 * CONTENT-TYPE IS LEFT UNSET so the browser generates the multipart boundary — the axios instance
 * strips its JSON default for `FormData` bodies, the same way `changeProfilePicture` relies on.
 */
export const mediaApi = {
  /**
   * POST /v1/api/media — uploads one or more images, returns their public URLs in order.
   *
   * The backend validates every file BEFORE writing any of them, deliberately, so a rejected
   * request leaves no orphaned object behind — which is why this can be called with a batch and
   * treated as all-or-nothing.
   *
   * `onProgress` is the browser's upload progress (0–100). It fires for the request BODY only —
   * once the last byte is sent it sits at 100 while the server validates and writes, so a caller
   * showing a bar should keep it visible until the promise resolves, not hide it at 100.
   */
  upload: (files: File[], onProgress?: (percent: number) => void) => {
    const formData = new FormData();
    for (const file of files) formData.append('files', file);
    return api
      .post<MediaUploadResponse>('/v1/api/media', formData, {
        onUploadProgress: onProgress
          ? (event) => onProgress(Math.round((event.loaded / (event.total || event.loaded)) * 100))
          : undefined,
      })
      .then((r) => r.data);
  },
};
