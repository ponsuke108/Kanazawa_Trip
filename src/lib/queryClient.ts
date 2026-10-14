// TanStack Query の設定（要件定義書 11.2、11.3）
import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { isApiError } from '@/api/errors';
import { STALE_TIME } from '@/api/queryKeys';

// api が UNAUTHORIZED を投げたことを画面（RootLayout）に知らせるイベント（BR-14）
export const UNAUTHORIZED_EVENT = 'travel-note:unauthorized';

function notifyIfUnauthorized(error: unknown) {
  if (isApiError(error) && error.code === 'UNAUTHORIZED') {
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  }
}

// 通信や想定外のエラーだけ1回やり直す
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (isApiError(error) && error.code !== 'NETWORK' && error.code !== 'UNKNOWN') return false;
  return failureCount < 1;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({ onError: notifyIfUnauthorized }),
    mutationCache: new MutationCache({ onError: notifyIfUnauthorized }),
    defaultOptions: {
      queries: {
        staleTime: STALE_TIME.default,
        retry: shouldRetry,
        refetchOnWindowFocus: false,
      },
      mutations: { retry: false },
    },
  });
}
