import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SpotPost } from '@/types/models';

const post = (imageUrls: string[]): SpotPost => ({
  id: 'p',
  spot: { id: 8, name: 'にし茶屋街' },
  author: { id: 'u', displayName: '太郎' },
  body: 'x',
  imageUrls,
  isCampaign: false,
  isHidden: false,
  rewardId: null,
  createdAt: '',
  updatedAt: '',
});

describe('spotPostImagePaths（編集のとき、写真のパスを URL から戻す）', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('spot-post-images の公開URLから、{ユーザーID}/{名前}.jpg を取り出す', async () => {
    vi.stubEnv('VITE_USE_MOCK', 'false');
    const { spotPostImagePaths } = await import('@/api/spotPosts');
    const base = 'https://example.supabase.co/storage/v1/object/public/spot-post-images/';
    expect(
      spotPostImagePaths(post([`${base}u1/a.jpg`, `${base}u1/b.jpg?t=1`, 'https://other/x.jpg'])),
    ).toEqual(['u1/a.jpg', 'u1/b.jpg']);
  });
});
