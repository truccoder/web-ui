'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getTokens } from '@/core/api/axios';
import { notificationKeys } from './keys';

/**
 * A live notification stream, replacing the 5-second poll.
 *
 * WHY NOT `EventSource`. The browser's own SSE client cannot set request headers, and this
 * endpoint authenticates from `Authorization: Bearer` only — measured in
 * `JwtAuthenticationFilter`, which reads the header and nothing else, with no `access_token`
 * query parameter to fall back on. Putting a JWT in a query string would also write it into
 * every access log between here and the server. So the stream is read with `fetch` and the
 * body is parsed by hand; it is about thirty lines and no dependency.
 *
 * WHAT IT DOES WITH AN EVENT: invalidate, not merge. The server sends the notification object,
 * and it would be possible to splice it into the cached list. Invalidating instead means one
 * source of truth for what the list contains — the same code path as a normal load — and the
 * cost is one small request per event, on an endpoint that is already paged.
 *
 * THREE EVENT NAMES, and only one of them is news: `connected` on subscribe, `notification` for
 * the real thing, `heartbeat` every 25s to hold the connection open through proxies. The
 * heartbeat is deliberately ignored rather than treated as a refresh.
 *
 * RECONNECTION IS THE BROWSER'S JOB WITH `EventSource` AND OURS HERE. A dropped stream is
 * retried with a growing delay, capped, so a backend restart during a demo does not leave the
 * bell permanently dead — it comes back within a few seconds.
 */
export function useNotificationStream(enabled = true) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    const base = process.env.NEXT_PUBLIC_API_URL ?? '';
    let controller: AbortController | null = null;
    let retry = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;

    const refresh = () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.list() });
    };

    const open = async () => {
      const token = getTokens()?.accessToken as string | undefined;
      // No session, nothing to stream. The retry loop below still runs, so signing in starts
      // the stream without a reload.
      if (!token) {
        schedule();
        return;
      }

      controller = new AbortController();
      try {
        const response = await fetch(`${base}/v1/api/notifications/stream`, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
          signal: controller.signal,
        });
        if (!response.ok || !response.body) throw new Error(`stream ${response.status}`);

        retry = 0;
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // SSE frames are separated by a blank line. Anything after the last one is a partial
          // frame and stays in the buffer.
          const frames = buffer.split('\n\n');
          buffer = frames.pop() ?? '';

          for (const frame of frames) {
            const event = /^event:\s*(.+)$/m.exec(frame)?.[1]?.trim();
            if (event === 'notification') refresh();
          }
        }
      } catch {
        // Abort during cleanup lands here too; `stopped` tells the two apart.
      }
      if (!stopped) schedule();
    };

    const schedule = () => {
      if (stopped) return;
      const delay = Math.min(1000 * 2 ** retry, 30_000);
      retry += 1;
      timer = setTimeout(open, delay);
    };

    void open();

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      controller?.abort();
    };
  }, [enabled, queryClient]);
}
