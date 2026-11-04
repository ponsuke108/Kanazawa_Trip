// TanStack Query のキー（要件定義書 11.2）。画面はここのキーだけを使う
export const queryKeys = {
  tags: ['tags'] as const,
  spots: ['spots'] as const,
  // （v11）
  spot: {
    detail: (spotId: number) => ['spots', 'detail', spotId] as const,
    posts: (spotId: number) => ['spots', 'posts', spotId] as const,
  },
  places: (query: string) => ['places', query] as const,
  lists: {
    all: ['lists'] as const,
    detail: (listId: string) => ['lists', 'detail', listId] as const,
  },
  posts: {
    mine: ['posts', 'mine'] as const,
  },
  shared: (token: string) => ['shared', token] as const,
  plans: {
    all: ['plans'] as const,
    search: (tagIds: number[]) => ['plans', 'search', tagIds] as const,
    ranking: (type: 'overall' | 'minor', limit: number) =>
      ['plans', 'ranking', type, limit] as const,
    detail: (planId: string) => ['plans', 'detail', planId] as const,
    mine: ['plans', 'mine'] as const,
    liked: ['plans', 'liked'] as const,
    bySpot: (spotId: number) => ['plans', 'bySpot', spotId] as const,
  },
  likes: {
    has: (planId: string) => ['likes', 'has', planId] as const,
  },
};

// 再取得までの時間（11.2）
export const STALE_TIME = {
  never: Infinity,
  default: 30_000,
};
