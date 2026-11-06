import type { QueryClient } from '@tanstack/react-query';
import type { AuthUser } from '@/types/models';

// ログアウトや、別のタブで別の人がログインしたことを画面に反映する。
// 別の人に変わったら前の人のデータを捨てる。開いている画面のデータは新しい人の分を読み直す
export function applyAuthChange(
  queryClient: QueryClient,
  user: AuthUser | null,
  setUser: (user: AuthUser | null) => void,
): void {
  setUser(user);
  if (!user) return;
  queryClient.getMutationCache().clear();
  void queryClient.resetQueries();
}
