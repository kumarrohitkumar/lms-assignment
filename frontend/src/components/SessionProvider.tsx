'use client';

import { usePathname, useRouter } from 'next/navigation';
import { createContext, Fragment, type ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { User } from '@/lib/types';

interface Session {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Re-checked on every navigation: Next keeps layouts alive in the background, so the person
  // behind this tree can change after a logout and a new login.
  useEffect(() => {
    api<{ user: User }>('/auth/me').then(
      ({ user: me }) => {
        setUser((prev) => (prev?.id === me.id && prev.role === me.role ? prev : me));
        setLoading(false);
      },
      () => router.replace('/login'),
    );
  }, [pathname, router]);

  const logout = useCallback(async () => {
    await api('/auth/logout', { method: 'POST' }).catch(() => undefined);
    // A full page load (not router.push) drops every piece of client state that belonged to this session.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign('/login');
  }, []);

  return (
    <SessionContext.Provider value={{ user, loading, logout }}>
      {/* Remount everything below when the user changes so no state leaks between accounts. */}
      <Fragment key={user?.id ?? 'pending'}>{children}</Fragment>
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>');
  return ctx;
}
