import { USE_MOCK } from '@/api/config';
import { mockApi } from '@/api/mock/mockApi';
import { notImplemented } from '@/api/notImplemented';

// BR-13：縮小・変換して Storage へアップロードする
export async function uploadPlanImage(file: File): Promise<{ path: string; url: string }> {
  if (USE_MOCK) return mockApi.uploadPlanImage(file);
  return notImplemented('uploadPlanImage');
}
