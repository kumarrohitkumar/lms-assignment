'use client';

import { usePathname } from 'next/navigation';
import { createContext, Fragment, type ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { api, ApiError, errorMessage } from '@/lib/api';
import type { User } from '@/lib/types';
import { Alert } from './ui';

interface Session {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Re-checked on every navigation: Next keeps layouts alive in the background, so the person
  // behind this tree can change after a logout and a new login.
  useEffect(() => {
    api<{ user: User }>('/auth/me').then(
      ({ user: me }) => {
        setUser((prev) => (prev?.id === me.id && prev.role === me.role ? prev : me));
        setError(null);
        setLoading(false);
      },
      async (err) => {
        if (err instanceof ApiError && err.status === 401) {
          // The cookie still decodes (so the route guard would bounce /login back here) but the API
          // rejects it: user deleted, DB reseeded, secret rotated. Clear it, then start over.
          await api('/auth/logout', { method: 'POST' }).catch(() => undefined);
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          window.location.assign('/login');
        } else {
          setError(errorMessage(err));
          setLoading(false);
        }
      },
    );
  }, [pathname]);

  const logout = useCallback(async () => {
    await api('/auth/logout', { method: 'POST' }).catch(() => undefined);
    // A full page load (not router.push) drops every piece of client state that belonged to this session.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign('/login');
  }, []);

  return (
    <SessionContext.Provider value={{ user, loading, logout }}>
      {/* Remount everything below when the user changes so no state leaks between accounts. */}
      {error ? (
        <div className="mx-auto w-full max-w-xl px-4 py-16">
          <Alert title="Can't reach Kosh right now">{error} Refresh the page to try again.</Alert>
        </div>
      ) : (
        <Fragment key={user?.id ?? 'pending'}>{children}</Fragment>
      )}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>');
  return ctx;
}
