import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { FullScreenLoading } from '@/components/common/FullScreenLoading';
import { useAuth } from '@/hooks/useAuth';

// BR-14：ログインしていなければ、開こうとしたURLを redirect に付けて S-12 へ
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <FullScreenLoading />;
  if (!user) {
    const redirect = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }
  return <>{children}</>;
}

// ログイン済みで /login を開いたらホームへ（6.3）
export function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <FullScreenLoading />;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}
