import { USE_MOCK } from '@/api/config';
import { ApiError, toApiError } from '@/api/errors';
import { mockApi } from '@/api/mock/mockApi';
import { call, currentUserId, rows as fetchRows } from '@/api/supabaseCall';
import { getSupabase } from '@/lib/supabase';

// BR-08：すでに同じ状態ならエラーにしない。自分のプランや非公開のプランは RLS で拒否される
export async function likePlan(planId: string): Promise<void> {
  if (USE_MOCK) return mockApi.likePlan(planId);
  const userId = await currentUserId();
  const { error, status } = await getSupabase()
    .from('likes')
    .insert({ user_id: userId, plan_id: planId });
  if (!error) return;
  if (error.code === '23505') return; // すでにいいね済み
  const e = toApiError({ ...error, status });
  throw e.code === 'UNKNOWN' ? new ApiError('FORBIDDEN', e.message) : e;
}

export async function unlikePlan(planId: string): Promise<void> {
  if (USE_MOCK) return mockApi.unlikePlan(planId);
  const userId = await currentUserId();
  await call(getSupabase().from('likes').delete().eq('user_id', userId).eq('plan_id', planId));
}

export async function hasLiked(planId: string): Promise<boolean> {
  if (USE_MOCK) return mockApi.hasLiked(planId);
  const userId = await currentUserId();
  const rows = await fetchRows(
    getSupabase()
      .from('likes')
      .select('plan_id')
      .eq('user_id', userId)
      .eq('plan_id', planId)
      .limit(1),
  );
  return rows.length > 0;
}
