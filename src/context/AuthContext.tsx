import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getBackend } from '../lib/backend';
import { isSupabaseConfigured } from '../lib/config';
import type { Profile } from '../lib/types';

interface AuthContextValue {
  profile: Profile | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  applyProfile: (profile: Profile | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    const backend = getBackend();
    let active = true;

    backend
      .getSession()
      .then((next) => {
        if (active) setProfile(next);
      })
      .catch(() => {
        /* a failed session probe means "signed out" */
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const unsubscribe = backend.onAuthStateChange((next) => {
      if (!active) return;
      setProfile(next);
      setLoading(false);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    setProfile(await getBackend().getSession());
  }, []);

  const signOut = useCallback(async () => {
    await getBackend().signOut();
    setProfile(null);
  }, []);

  const applyProfile = useCallback((next: Profile | null) => setProfile(next), []);

  const value = useMemo<AuthContextValue>(
    () => ({ profile, loading, refresh, signOut, applyProfile }),
    [profile, loading, refresh, signOut, applyProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>.');
  return context;
}
