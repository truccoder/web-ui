'use client';

import { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { makeStore, type AppStore } from './index';
import { setCredentials } from './auth-slice';

const AUTH_STORAGE_KEY = 'auth_tokens';

function persistAuth(store: AppStore) {
  const { accessToken, refreshToken } = store.getState().auth;
  if (accessToken && refreshToken) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ accessToken, refreshToken }));
  } else {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [store] = useState<AppStore>(() => {
    const newStore = makeStore();

    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        try {
          const { accessToken, refreshToken } = JSON.parse(stored);
          if (accessToken && refreshToken) {
            newStore.dispatch(setCredentials({ accessToken, refreshToken }));
          }
        } catch {
          localStorage.removeItem(AUTH_STORAGE_KEY);
        }
      }
    }

    return newStore;
  });

  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      persistAuth(store);
    });
    return unsubscribe;
  }, [store]);

  return <Provider store={store}>{children}</Provider>;
}
