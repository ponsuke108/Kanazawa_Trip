import { USE_MOCK } from '@/api/config';
import { mockApi } from '@/api/mock/mockApi';
import { notImplemented } from '@/api/notImplemented';
import type { PlanDetail, PlanSummary, SavePlanInput, SearchResult } from '@/types/models';

export type RankingType = 'overall' | 'minor';

// BR-01
export async function searchPlans(args: { tagIds: number[]; page: number }): Promise<SearchResult> {
  if (USE_MOCK) return mockApi.searchPlans(args);
  return notImplemented('searchPlans');
}

// BR-11
export async function getRanking(args: {
  type: RankingType;
  limit: number;
}): Promise<PlanSummary[]> {
  if (USE_MOCK) return mockApi.getRanking(args);
  return notImplemented('getRanking');
}

// 見つからない・権限がないときは null（10.1）
export async function getPlan(planId: string): Promise<PlanDetail | null> {
  if (USE_MOCK) return mockApi.getPlan(planId);
  return notImplemented('getPlan');
}

export async function savePlan(input: SavePlanInput): Promise<{ id: string }> {
  if (USE_MOCK) return mockApi.savePlan(input);
  return notImplemented('savePlan');
}

// BR-09
export async function unpublishPlan(planId: string): Promise<void> {
  if (USE_MOCK) return mockApi.unpublishPlan(planId);
  return notImplemented('unpublishPlan');
}

// BR-10
export async function deletePlan(planId: string): Promise<void> {
  if (USE_MOCK) return mockApi.deletePlan(planId);
  return notImplemented('deletePlan');
}

export async function getMyPlans(): Promise<PlanSummary[]> {
  if (USE_MOCK) return mockApi.getMyPlans();
  return notImplemented('getMyPlans');
}

export async function getLikedPlans(): Promise<PlanSummary[]> {
  if (USE_MOCK) return mockApi.getLikedPlans();
  return notImplemented('getLikedPlans');
}
