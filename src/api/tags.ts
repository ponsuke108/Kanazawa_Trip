import { USE_MOCK } from '@/api/config';
import { mockApi } from '@/api/mock/mockApi';
import { notImplemented } from '@/api/notImplemented';
import type { Tag } from '@/types/models';

// タグを sort_order 順に取得（10.3）
export async function getTags(): Promise<Tag[]> {
  if (USE_MOCK) return mockApi.getTags();
  return notImplemented('getTags');
}
