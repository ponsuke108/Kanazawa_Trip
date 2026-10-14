import { useContext } from 'react';
import { AuthContext } from '@/hooks/authContext';

// ログイン状態（要件定義書 11.3）。{ user, isLoading } を返す
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth は AuthProvider の中で使ってください');
  return ctx;
}

// ログイン済みの画面で使う。RequireAuth の中なので user は必ずある（11.3）
export function useCurrentUser() {
  const { user } = useAuth();
  if (!user) throw new Error('ログインしていません');
  return user;
}
