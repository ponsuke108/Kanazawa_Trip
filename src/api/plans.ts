import { USE_MOCK } from '@/api/config';
import { ApiError } from '@/api/errors';
import {
  sortTags,
  toBlocks,
  toSavePlanJson,
  toSharedPlan,
  toSummary,
  type BlockRow,
  type SharedPlanJson,
} from '@/api/mappers';
import { mockApi } from '@/api/mock/mockApi';
import {
  currentUserId,
  imageUrlOf,
  isUuid,
  maybeOne,
  one,
  rows as fetchRows,
} from '@/api/supabaseCall';
import { getSupabase, PLAN_IMAGES_BUCKET } from '@/lib/supabase';
import type { Json } from '@/types/database';
import type {
  PlanDetail,
  PlanStatus,
  PlanSummary,
  SavePlanInput,
  SearchResult,
} from '@/types/models';

export type RankingType = 'overall' | 'minor';

const PAGE_SIZE = 20; // BR-01

// BR-01（RPC search_plans）
export async function searchPlans({
  tagIds,
  page,
}: {
  tagIds: number[];
  page: number;
}): Promise<SearchResult> {
  if (USE_MOCK) return mockApi.searchPlans({ tagIds, page });
  const rows = await fetchRows(
    getSupabase().rpc('search_plans', { p_tag_ids: tagIds, p_page: page, p_page_size: PAGE_SIZE }),
  );
  const totalCount = rows.length > 0 ? Number(rows[0].total_count) : 0;
  return {
    items: rows.map((r) => toSummary(r, imageUrlOf)),
    totalCount,
    hasMore: (page + 1) * PAGE_SIZE < totalCount, // 10.4
  };
}

// BR-11：公開中だけ。いいね数が多い順、同数なら公開日時が新しい順
export async function getRanking({
  type,
  limit,
}: {
  type: RankingType;
  limit: number;
}): Promise<PlanSummary[]> {
  if (USE_MOCK) return mockApi.getRanking({ type, limit });
  let q = getSupabase().from('plan_summaries').select('*').eq('status', 'published');
  if (type === 'minor') q = q.eq('has_minor_spot', true);
  const rows = await fetchRows(
    q
      .order('like_count', { ascending: false })
      .order('published_at', { ascending: false })
      .order('id')
      .limit(limit),
  );
  return rows.map((r) => toSummary(r, imageUrlOf));
}

// 1行で書く（型の推論のため）。plans と profiles は likes 経由でもつながるので、外部キーを指定する
const PLAN_DETAIL_COLUMNS =
  'id, title, status, user_id, source_plan_id, published_at, updated_at, author:profiles!plans_user_id_fkey(display_name),plan_blocks(id, position, block_type, spot_id, transport_mode, body, image_path, spot:spots(*)), plan_tags(tag:tags(*))';

// 見つからない・権限がないときは null（10.1）
export async function getPlan(planId: string): Promise<PlanDetail | null> {
  if (USE_MOCK) return mockApi.getPlan(planId);
  if (!isUuid(planId)) return null;
  const supabase = getSupabase();
  const plan = await maybeOne(
    supabase.from('plans').select(PLAN_DETAIL_COLUMNS).eq('id', planId).maybeSingle(),
  );
  if (!plan) return null;

  const [summary, source] = await Promise.all([
    maybeOne(supabase.from('plan_summaries').select('like_count').eq('id', planId).maybeSingle()),
    plan.source_plan_id
      ? maybeOne(
          supabase
            .from('plan_summaries')
            .select('id, author_name, status')
            .eq('id', plan.source_plan_id)
            .maybeSingle(),
        )
      : Promise.resolve(null),
  ]);

  const tagRows = plan.plan_tags.flatMap((pt) => (pt.tag ? [pt.tag] : []));
  return {
    id: plan.id,
    title: plan.title,
    status: plan.status as PlanStatus,
    author: { id: plan.user_id, displayName: plan.author?.display_name ?? '' },
    // BR-07：コピー元が削除・非公開なら表示しない
    sourcePlan:
      source && source.id && source.status === 'published'
        ? { id: source.id, authorName: source.author_name ?? '' }
        : null,
    tags: sortTags(tagRows).sort((a, b) => a.id - b.id),
    likeCount: summary?.like_count ?? 0,
    publishedAt: plan.published_at,
    updatedAt: plan.updated_at,
    blocks: toBlocks(plan.plan_blocks as BlockRow[], imageUrlOf),
  };
}

// RPC save_plan（10.5）。検証の失敗は VALIDATION の ApiError になる
export async function savePlan(input: SavePlanInput): Promise<{ id: string }> {
  if (USE_MOCK) return mockApi.savePlan(input);
  const id = await one(
    getSupabase().rpc('save_plan', { p_plan: toSavePlanJson(input) as unknown as Json }),
  );
  return { id };
}

// BR-09：下書きに戻し、公開日時を空にする。いいねは残す
export async function unpublishPlan(planId: string): Promise<void> {
  if (USE_MOCK) return mockApi.unpublishPlan(planId);
  const rows = await fetchRows(
    getSupabase()
      .from('plans')
      .update({ status: 'draft', published_at: null })
      .eq('id', planId)
      .select('id'),
  );
  if (rows.length === 0) throw new ApiError('FORBIDDEN');
}

// BR-10：写真を消してからプランを削除する（写真の削除に失敗しても続ける）
export async function deletePlan(planId: string): Promise<void> {
  if (USE_MOCK) return mockApi.deletePlan(planId);
  const supabase = getSupabase();
  const userId = await currentUserId();
  const blocks = await fetchRows(
    supabase
      .from('plan_blocks')
      .select('image_path')
      .eq('plan_id', planId)
      .not('image_path', 'is', null),
  );
  const paths = blocks
    .map((b) => b.image_path)
    .filter((p): p is string => typeof p === 'string' && p.startsWith(`${userId}/`));
  if (paths.length > 0) {
    try {
      await supabase.storage.from(PLAN_IMAGES_BUCKET).remove(paths);
    } catch {
      // 写真の削除に失敗してもプランの削除は続ける
    }
  }
  const rows = await fetchRows(supabase.from('plans').delete().eq('id', planId).select('id'));
  if (rows.length === 0) throw new ApiError('FORBIDDEN');
}

// 自分のプランを更新日時の新しい順
export async function getMyPlans(): Promise<PlanSummary[]> {
  if (USE_MOCK) return mockApi.getMyPlans();
  const userId = await currentUserId();
  const rows = await fetchRows(
    getSupabase()
      .from('plan_summaries')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false }),
  );
  return rows.map((r) => toSummary(r, imageUrlOf));
}

// いいねしたプランを、いいねした日時の新しい順。非公開になったものは RLS で見えない（BR-09）
export async function getLikedPlans(): Promise<PlanSummary[]> {
  if (USE_MOCK) return mockApi.getLikedPlans();
  const supabase = getSupabase();
  const userId = await currentUserId();
  const likes = await fetchRows(
    supabase
      .from('likes')
      .select('plan_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
  );
  if (likes.length === 0) return [];
  const rows = await fetchRows(
    supabase
      .from('plan_summaries')
      .select('*')
      .in(
        'id',
        likes.map((l) => l.plan_id),
      ),
  );
  const byId = new Map(rows.map((r) => [r.id, r]));
  return likes.flatMap((l) => {
    const r = byId.get(l.plan_id);
    return r ? [toSummary(r, imageUrlOf)] : [];
  });
}

// （v11）そのスポットを含む公開中のプランを、いいね数の多い順に5件（S-05）
export async function getPlansBySpot(spotId: number): Promise<PlanSummary[]> {
  if (USE_MOCK) return mockApi.getPlansBySpot(spotId);
  const supabase = getSupabase();
  const blocks = await fetchRows(
    supabase.from('plan_blocks').select('plan_id').eq('spot_id', spotId),
  );
  const planIds = [...new Set(blocks.map((b) => b.plan_id))];
  if (planIds.length === 0) return [];
  const rows = await fetchRows(
    supabase
      .from('plan_summaries')
      .select('*')
      .eq('status', 'published')
      .in('id', planIds)
      .order('like_count', { ascending: false })
      .order('published_at', { ascending: false })
      .order('id')
      .limit(5),
  );
  return rows.map((r) => toSummary(r, imageUrlOf));
}

// （v11）共有リンク（BR-30）。合言葉は推測できない32文字（英数字と - _）
function newShareToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_');
}

export function shareUrlOf(token: string): string {
  return `${window.location.origin}/shared/${token}`;
}

// 共有リンクを作る。すでに共有していれば、そのリンクを返す
export async function createShareLink(planId: string): Promise<{ url: string }> {
  if (USE_MOCK) return mockApi.createShareLink(planId);
  const supabase = getSupabase();
  const userId = await currentUserId();
  const plan = await maybeOne(
    supabase
      .from('plans')
      .select('share_token')
      .eq('id', planId)
      .eq('user_id', userId)
      .maybeSingle(),
  );
  if (!plan) throw new ApiError('FORBIDDEN');
  if (plan.share_token) return { url: shareUrlOf(plan.share_token) };
  const token = newShareToken();
  const rows = await fetchRows(
    supabase.from('plans').update({ share_token: token }).eq('id', planId).select('id'),
  );
  if (rows.length === 0) throw new ApiError('FORBIDDEN');
  return { url: shareUrlOf(token) };
}

// 共有を止める。以前のリンクは見られなくなる（BR-30）
export async function stopShareLink(planId: string): Promise<void> {
  if (USE_MOCK) return mockApi.stopShareLink(planId);
  const rows = await fetchRows(
    getSupabase().from('plans').update({ share_token: null }).eq('id', planId).select('id'),
  );
  if (rows.length === 0) throw new ApiError('FORBIDDEN');
}

// 共有されたプラン（RPC get_shared_plan）。ログインしていなくても呼べる（BR-30）
export async function getSharedPlan(token: string): Promise<PlanDetail | null> {
  if (USE_MOCK) return mockApi.getSharedPlan(token);
  if (!/^[A-Za-z0-9_-]{32}$/.test(token)) return null;
  const data = await maybeOne(getSupabase().rpc('get_shared_plan', { p_token: token }));
  if (!data) return null;
  return toSharedPlan(data as unknown as SharedPlanJson, imageUrlOf);
}
