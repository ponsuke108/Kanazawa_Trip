// （v11）行きたい場所のリスト（要件定義書 BR-18、10.3）。本人だけが読み書きできる（RLS）
import { USE_MOCK } from '@/api/config';
import { ApiError, toApiError } from '@/api/errors';
import { sortSpots, toListSummary, type ListRow } from '@/api/mappers';
import { mockApi } from '@/api/mock/mockApi';
import {
  call,
  currentUserId,
  isUuid,
  maybeOne,
  one,
  rows,
  spotImageUrlOf,
} from '@/api/supabaseCall';
import { getSupabase } from '@/lib/supabase';
import type { ListDetail, ListSummary } from '@/types/models';

const LIST_NAME_MAX = 30; // BR-18

// 前後の空白を取り除く（BR-18）
function cleanName(name: string): string {
  return name.trim();
}

// 自分のリストを更新の新しい順
export async function getLists(): Promise<ListSummary[]> {
  if (USE_MOCK) return mockApi.getLists();
  const data = await rows(
    getSupabase()
      .from('lists')
      .select('id, name, updated_at, list_spots(spot_id, added_at, spot:spots(name))')
      .order('updated_at', { ascending: false }),
  );
  return (data as ListRow[]).map(toListSummary);
}

// リストとスポット（入れた順。使用中止のものも返す）。見つからなければ null
export async function getList(listId: string): Promise<ListDetail | null> {
  if (USE_MOCK) return mockApi.getList(listId);
  if (!isUuid(listId)) return null;
  const supabase = getSupabase();
  const list = await maybeOne(
    supabase
      .from('lists')
      .select('id, name, updated_at, list_spots(spot_id, added_at)')
      .eq('id', listId)
      .maybeSingle(),
  );
  if (!list) return null;
  const order = [...list.list_spots].sort(
    (a, b) => a.added_at.localeCompare(b.added_at) || a.spot_id - b.spot_id,
  );
  const ids = order.map((s) => s.spot_id);
  const summaries =
    ids.length === 0
      ? []
      : sortSpots(
          await rows(supabase.from('spot_summaries').select('*').in('id', ids)),
          spotImageUrlOf,
        );
  const byId = new Map(summaries.map((s) => [s.id, s]));
  return {
    id: list.id,
    name: list.name,
    spots: ids.flatMap((id) => {
      const s = byId.get(id);
      return s ? [s] : [];
    }),
    updatedAt: list.updated_at,
  };
}

// リストを作る。1人20個を超えると LIMIT_REACHED（BR-18）
export async function createList({ name }: { name: string }): Promise<{ id: string }> {
  if (USE_MOCK) return mockApi.createList({ name });
  const userId = await currentUserId();
  const row = await one(
    getSupabase()
      .from('lists')
      .insert({ user_id: userId, name: cleanName(name) })
      .select('id')
      .single(),
  );
  return { id: row.id };
}

// リストを作ってスポットをまとめて入れる（F-44、BR-18）。
// 名前はプランのタイトル（30文字まで）、同じスポットは1つにまとめる
export async function createListFromSpots({
  name,
  spotIds,
}: {
  name: string;
  spotIds: number[];
}): Promise<{ id: string }> {
  if (USE_MOCK) return mockApi.createListFromSpots({ name, spotIds });
  const { id } = await createList({ name: cleanName(name).slice(0, LIST_NAME_MAX) });
  const unique = [...new Set(spotIds)];
  // 入れた順を保つため、1件ずつ時刻をずらして入れる
  const base = Date.now();
  if (unique.length > 0) {
    await call(
      getSupabase()
        .from('list_spots')
        .insert(
          unique.map((spotId, i) => ({
            list_id: id,
            spot_id: spotId,
            added_at: new Date(base + i).toISOString(),
          })),
        ),
    );
  }
  return { id };
}

export async function renameList(listId: string, name: string): Promise<void> {
  if (USE_MOCK) return mockApi.renameList(listId, name);
  const data = await rows(
    getSupabase()
      .from('lists')
      .update({ name: cleanName(name) })
      .eq('id', listId)
      .select('id'),
  );
  if (data.length === 0) throw new ApiError('NOT_FOUND');
}

// リストを消してもプランは消えない（BR-18）
export async function deleteList(listId: string): Promise<void> {
  if (USE_MOCK) return mockApi.deleteList(listId);
  const data = await rows(getSupabase().from('lists').delete().eq('id', listId).select('id'));
  if (data.length === 0) throw new ApiError('NOT_FOUND');
}

// list_spots に追加。すでにあれば added: false（BR-18「リストに入っています」）。30件を超えると LIMIT_REACHED
export async function addSpotToList(listId: string, spotId: number): Promise<{ added: boolean }> {
  if (USE_MOCK) return mockApi.addSpotToList(listId, spotId);
  const supabase = getSupabase();
  const exists = await maybeOne(
    supabase
      .from('list_spots')
      .select('spot_id')
      .eq('list_id', listId)
      .eq('spot_id', spotId)
      .maybeSingle(),
  );
  if (exists) return { added: false };
  try {
    await call(supabase.from('list_spots').insert({ list_id: listId, spot_id: spotId }));
  } catch (e) {
    // 同時に入れたときの重複（一意の制約）は「入っています」とする
    const raw = e as { message?: string };
    if (/duplicate key/i.test(raw.message ?? '')) return { added: false };
    throw toApiError(e);
  }
  return { added: true };
}

export async function removeSpotFromList(listId: string, spotId: number): Promise<void> {
  if (USE_MOCK) return mockApi.removeSpotFromList(listId, spotId);
  await call(getSupabase().from('list_spots').delete().eq('list_id', listId).eq('spot_id', spotId));
}
