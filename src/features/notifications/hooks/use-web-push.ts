'use client';

import { useCallback, useEffect, useState } from 'react';
import OneSignal from 'react-onesignal';

/**
 * Web push through OneSignal (`NotificationController` reads `onesignalPlayerId` off the
 * preference row; the SDK is what fills it in).
 *
 * FEATURE-FLAGGED ON `NEXT_PUBLIC_ONESIGNAL_APP_ID`. With no app id — the state in this
 * environment, and in any deploy that has not configured OneSignal — `configured` is false and
 * nothing initialises. The preference panel shows an explanation instead of a dead toggle.
 *
 * CANNOT BE VERIFIED END TO END HERE: delivery also needs `onesignal.app-id` + `api-key` set on
 * the backend. What this hook does verifiably is init the SDK, request browser permission, opt the
 * subscription in, and hand back its id so a caller can `PUT /preferences { onesignalPlayerId }`.
 *
 * ITS SERVICE WORKER IS SCOPED TO `/onesignal/` (`serviceWorkerParam` below) so it never collides
 * with the app's own `public/sw.js`, which owns the root scope. `public/onesignal/OneSignalSDKWorker.js`
 * is the one-line shim that imports the CDN SDK; `src/middleware.ts` excludes `/onesignal/` from
 * its matcher so that file is not 307'd to `/login`.
 */
const APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;

let initPromise: Promise<boolean> | null = null;

function ensureInit(): Promise<boolean> {
  if (!APP_ID) return Promise.resolve(false);
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (!initPromise) {
    initPromise = OneSignal.init({
      appId: APP_ID,
      serviceWorkerParam: { scope: '/onesignal/' },
      serviceWorkerPath: 'onesignal/OneSignalSDKWorker.js',
      // The dev server is http://localhost; without this OneSignal refuses to init off HTTPS.
      allowLocalhostAsSecureOrigin: true,
    })
      .then(() => true)
      .catch(() => {
        initPromise = null;
        return false;
      });
  }
  return initPromise;
}

export interface WebPushState {
  /** The build has an OneSignal app id. When false, none of the rest is meaningful. */
  configured: boolean;
  /** The SDK finished initialising. */
  ready: boolean;
  /** The browser can receive web push at all (not Safari on iOS < 16.4, not a private window). */
  supported: boolean;
  /** Native browser permission for this origin. */
  permission: NotificationPermission;
  /** The push subscription id — this is what goes to `PUT /preferences` as `onesignalPlayerId`. */
  playerId: string | null;
  /**
   * Ask for permission and opt in. Resolves to the subscription id on success, or null if the
   * user denied or the browser cannot do push. Safe to call when already subscribed.
   */
  subscribe: () => Promise<string | null>;
}

export function useWebPush(): WebPushState {
  const configured = Boolean(APP_ID);
  const [ready, setReady] = useState(false);
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [playerId, setPlayerId] = useState<string | null>(null);

  useEffect(() => {
    if (!configured) return;
    let cancelled = false;

    ensureInit().then((ok) => {
      if (cancelled || !ok) return;
      setReady(true);
      setSupported(OneSignal.Notifications.isPushSupported());
      setPermission(OneSignal.Notifications.permissionNative ?? 'default');
      setPlayerId(OneSignal.User.PushSubscription.id ?? null);

      const onSub = () => setPlayerId(OneSignal.User.PushSubscription.id ?? null);
      const onPerm = () => setPermission(OneSignal.Notifications.permissionNative ?? 'default');
      OneSignal.User.PushSubscription.addEventListener('change', onSub);
      OneSignal.Notifications.addEventListener('permissionChange', onPerm);
    });

    return () => {
      cancelled = true;
    };
  }, [configured]);

  const subscribe = useCallback(async (): Promise<string | null> => {
    const ok = await ensureInit();
    if (!ok || !OneSignal.Notifications.isPushSupported()) return null;
    const granted = await OneSignal.Notifications.requestPermission();
    setPermission(OneSignal.Notifications.permissionNative ?? 'default');
    if (!granted) return null;
    await OneSignal.User.PushSubscription.optIn();
    const id = OneSignal.User.PushSubscription.id ?? null;
    setPlayerId(id);
    return id;
  }, []);

  return { configured, ready, supported, permission, playerId, subscribe };
}
