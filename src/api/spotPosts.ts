// （v11）スポットの投稿（要件定義書 BR-21、10.3）。作る・直すのは RPC save_spot_post だけ
import { USE_MOCK } from '@/api/config';
import { ApiError } from '@/api/errors';
import { toSaveSpotPostJson, toSpotPost, type SpotPostRow } from '@/api/mappers';
import { mockApi } from '@/api/mock/mockApi';
import { currentUserId, isUuid, maybeOne, one, rows, spotImageUrlOf } from '@/api/supabaseCall';
import { getSupabase, SPOT_POST_IMAGES_BUCKET } from '@/lib/supabase';
import type { Json } from '@/types/database';
import type { SaveSpotPostInput, SpotPost } from '@/types/models';

const PAGE_SIZE = 20; // 10.3：20件ずつ

const POST_COLUMNS =
  'id, user_id, body, is_hidden, created_at, updated_at, spot:spots(id, name), author:profiles(display_name), images:spot_post_images(image_path, position)';

function toPosts(data: unknown): SpotPost[] {
  return (data as SpotPostRow[]).map((r) => toSpotPost(r, spotImageUrlOf));
}

// 表示中の投稿を新しい順に20件ずつ（S-05、S-13）
export async function getSpotPosts({
  spotId,
  page,
}: {
  spotId: number;
  page: number;
}): Promise<{ items: SpotPost[]; hasMore: boolean }> {
  if (USE_MOCK) return mockApi.getSpotPosts({ spotId, page });
  const from = page * PAGE_SIZE;
  // 1件多く取って、続きがあるかを確かめる
  const data = await rows(
    getSupabase()
      .from('spot_posts')
      .select(POST_COLUMNS)
      .eq('spot_id', spotId)
      .eq('is_hidden', false)
      .order('created_at', { ascending: false })
      .order('id')
      .range(from, from + PAGE_SIZE),
  );
  const posts = toPosts(data);
  return { items: posts.slice(0, PAGE_SIZE), hasMore: posts.length > PAGE_SIZE };
}

// 編集用（本人の投稿だけ）。見つからなければ null（S-17）
export async function getSpotPost(postId: string): Promise<SpotPost | null> {
  if (USE_MOCK) return mockApi.getSpotPost(postId);
  if (!isUuid(postId)) return null;
  const userId = await currentUserId();
  const row = await maybeOne(
    getSupabase()
      .from('spot_posts')
      .select(POST_COLUMNS)
      .eq('id', postId)
      .eq('user_id', userId)
      .maybeSingle(),
  );
  return row ? (toPosts([row])[0] ?? null) : null;
}

// 自分の投稿（非表示を含む）を新しい順（S-11）。有効な特典の id は I-36 で足す
export async function getMySpotPosts(): Promise<SpotPost[]> {
  if (USE_MOCK) return mockApi.getMySpotPosts();
  const userId = await currentUserId();
  const data = await rows(
    getSupabase()
      .from('spot_posts')
      .select(POST_COLUMNS)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .order('id'),
  );
  return toPosts(data);
}

// RPC save_spot_post（10.9、BR-21）。キャンペーン中のお店では、確かめた位置も渡す（BR-28）
export async function saveSpotPost(
  input: SaveSpotPostInput,
): Promise<{ id: string; rewardId: string | null }> {
  if (USE_MOCK) return mockApi.saveSpotPost(input);
  const result = await one(
    getSupabase().rpc('save_spot_post', {
      p_post: toSaveSpotPostJson(input) as unknown as Json,
    }),
  );
  const first = result[0];
  if (!first) throw new ApiError('UNKNOWN', 'save_spot_post の結果が空です');
  return { id: first.post_id, rewardId: first.reward_id };
}

// 写真を消してから投稿を削除する。写真の削除に失敗しても削除は完了させる（BR-21）
export async function deleteSpotPost(postId: string): Promise<void> {
  if (USE_MOCK) return mockApi.deleteSpotPost(postId);
  const supabase = getSupabase();
  const userId = await currentUserId();
  const images = await rows(
    supabase.from('spot_post_images').select('image_path').eq('post_id', postId),
  );
  const paths = images.map((i) => i.image_path).filter((p) => p.startsWith(`${userId}/`));
  if (paths.length > 0) {
    try {
      await supabase.storage.from(SPOT_POST_IMAGES_BUCKET).remove(paths);
    } catch {
      // 写真の削除に失敗しても投稿の削除は続ける
    }
  }
  const data = await rows(
    supabase.from('spot_posts').delete().eq('id', postId).eq('user_id', userId).select('id'),
  );
  if (data.length === 0) throw new ApiError('FORBIDDEN');
}
