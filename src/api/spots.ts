import { USE_MOCK } from '@/api/config';
import { sortSpots } from '@/api/mappers';
import { mockApi } from '@/api/mock/mockApi';
import { rows } from '@/api/supabaseCall';
import { getSupabase } from '@/lib/supabase';
import type { Spot } from '@/types/models';

// 使用中のスポットをエリア、sort_order、id の順に全件取得（10.3、BR-17）
export async function getSpots(): Promise<Spot[]> {
  if (USE_MOCK) return mockApi.getSpots();
  return sortSpots(await rows(getSupabase().from('spots').select('*').eq('is_active', true)));
}
