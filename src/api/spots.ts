import { USE_MOCK } from '@/api/config';
import { mockApi } from '@/api/mock/mockApi';
import { notImplemented } from '@/api/notImplemented';
import type { Spot } from '@/types/models';

// 使用中のスポットをエリア、sort_order、id の順に全件取得（10.3）
export async function getSpots(): Promise<Spot[]> {
  if (USE_MOCK) return mockApi.getSpots();
  return notImplemented('getSpots');
}
