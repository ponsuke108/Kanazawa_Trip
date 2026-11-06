import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getCurrentUser, onAuthChange } from '@/api/auth';
import { applyAuthChange } from '@/hooks/applyAuthChange';
import { AuthContext } from '@/hooks/authContext';
import type { AuthUser } from '@/types/models';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    let active = true;
    let changed = false; // 最初の読み込みの途中で入れ替わったら、新しいほうを残す
    getCurrentUser()
      .then((u) => {
        if (active && !changed) setUser(u);
      })
      .catch(() => {
        if (active && !changed) setUser(null);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    const unsubscribe = onAuthChange((u) => {
      changed = true;
      applyAuthChange(queryClient, u, setUser);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [queryClient]);

  const value = useMemo(() => ({ user, isLoading, setUser }), [user, isLoading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
