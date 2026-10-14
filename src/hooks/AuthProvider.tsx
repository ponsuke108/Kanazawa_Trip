import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { getCurrentUser, onAuthChange } from '@/api/auth';
import { AuthContext } from '@/hooks/authContext';
import type { AuthUser } from '@/types/models';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getCurrentUser()
      .then((u) => {
        if (active) setUser(u);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    const unsubscribe = onAuthChange((u) => setUser(u));
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const value = useMemo(() => ({ user, isLoading, setUser }), [user, isLoading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
