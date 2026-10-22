import { USE_MOCK } from '@/api/config';
import { mockApi } from '@/api/mock/mockApi';
import { notImplemented } from '@/api/notImplemented';

// BR-08：すでに同じ状態ならエラーにしない
export async function likePlan(planId: string): Promise<void> {
  if (USE_MOCK) return mockApi.likePlan(planId);
  return notImplemented('likePlan');
}

export async function unlikePlan(planId: string): Promise<void> {
  if (USE_MOCK) return mockApi.unlikePlan(planId);
  return notImplemented('unlikePlan');
}

export async function hasLiked(planId: string): Promise<boolean> {
  if (USE_MOCK) return mockApi.hasLiked(planId);
  return notImplemented('hasLiked');
}
