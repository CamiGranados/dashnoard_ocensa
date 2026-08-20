import { InjectionToken } from '@angular/core';

export type ReleaseSessionStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function browserSessionStorage(): ReleaseSessionStorage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export const RELEASE_SESSION_STORAGE = new InjectionToken<ReleaseSessionStorage | null>(
  'RELEASE_SESSION_STORAGE',
  {
    providedIn: 'root',
    factory: browserSessionStorage,
  },
);
