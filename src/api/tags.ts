import { USE_MOCK } from '@/api/config';
import { sortTags } from '@/api/mappers';
import { mockApi } from '@/api/mock/mockApi';
import { rows } from '@/api/supabaseCall';
import { getSupabase } from '@/lib/supabase';
import type { Tag } from '@/types/models';

// タグを sort_order 順に取得（10.3）
export async function getTags(): Promise<Tag[]> {
  if (USE_MOCK) return mockApi.getTags();
  return sortTags(await rows(getSupabase().from('tags').select('*')));
}
