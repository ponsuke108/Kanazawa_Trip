import { QueryClient, QueryObserver } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { applyAuthChange } from '@/hooks/applyAuthChange';
import type { AuthUser } from '@/types/models';

const admin: AuthUser = { id: 'admin', email: 'a@example.com', displayName: '花子', role: 'admin' };

describe('applyAuthChange', () => {
  it('別の人に変わると、前の人のデータを捨てて、開いている画面のデータだけ読み直す', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['closed'], 'old closed');
    const fetchOpen = vi.fn(async () => 'new open');
    queryClient.setQueryData(['open'], 'old open');
    const observer = new QueryObserver(queryClient, {
      queryKey: ['open'],
      queryFn: fetchOpen,
      staleTime: Infinity,
    });
    const unsubscribe = observer.subscribe(() => {});
    const setUser = vi.fn();

    applyAuthChange(queryClient, admin, setUser);

    expect(setUser).toHaveBeenCalledWith(admin);
    expect(queryClient.getQueryData(['closed'])).toBeUndefined();
    await vi.waitFor(() => expect(queryClient.getQueryData(['open'])).toBe('new open'));
    expect(fetchOpen).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('送っている途中の操作の記録も捨てる', () => {
    const queryClient = new QueryClient();
    queryClient.getMutationCache().build(queryClient, { mutationKey: ['x'] });
    applyAuthChange(queryClient, admin, vi.fn());
    expect(queryClient.getMutationCache().getAll()).toHaveLength(0);
  });

  it('ログアウトでは画面の状態だけを変える', () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['x'], 'kept');
    const setUser = vi.fn();
    applyAuthChange(queryClient, null, setUser);
    expect(setUser).toHaveBeenCalledWith(null);
    expect(queryClient.getQueryData(['x'])).toBe('kept');
  });
});
