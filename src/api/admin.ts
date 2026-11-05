// （v11 第3段階）管理者の操作（要件定義書 10.3、BR-26、BR-29）。
// 画面でも出し分けるが、守るのはデータベースの RLS と RPC（管理者でなければ FORBIDDEN）。
// どの操作も RPC が admin_actions に記録する
import { USE_MOCK } from '@/api/config';
import { toApplication, toSpotPost, type ApplicationRow, type SpotPostRow } from '@/api/mappers';
import { mockApi } from '@/api/mock/mockApi';
import { APPLICATION_COLUMNS, SHOP_COLUMNS, toShopDetail } from '@/api/shops';
import { POST_COLUMNS } from '@/api/spotPosts';
import { call, isUuid, maybeOne, rows, spotImageUrlOf } from '@/api/supabaseCall';
import { getSupabase } from '@/lib/supabase';
import type { ShopApplication, ShopDetail, SpotPost } from '@/types/models';

const PAGE_SIZE = 20;

// 申請の一覧：審査中を先に、新しい順（S-21）
export async function getApplications(): Promise<ShopApplication[]> {
  if (USE_MOCK) return mockApi.getApplications();
  const data = await rows(
    getSupabase()
      .from('shop_applications')
      .select(APPLICATION_COLUMNS)
      .order('created_at', { ascending: false }),
  );
  const list = (data as unknown as ApplicationRow[]).map(toApplication);
  return [...list].sort((a, b) => Number(b.status === 'pending') - Number(a.status === 'pending'));
}

export async function getApplication(id: string): Promise<ShopApplication | null> {
  if (USE_MOCK) return mockApi.getApplication(id);
  if (!isUuid(id)) return null;
  const row = await maybeOne(
    getSupabase().from('shop_applications').select(APPLICATION_COLUMNS).eq('id', id).maybeSingle(),
  );
  return row ? toApplication(row as unknown as ApplicationRow) : null;
}

// RPC review_application（BR-26）。却下は理由が必須
export async function reviewApplication(input: {
  id: string;
  approve: boolean;
  reason?: string;
}): Promise<void> {
  if (USE_MOCK) return mockApi.reviewApplication(input);
  await call(
    getSupabase().rpc('review_application', {
      p_id: input.id,
      p_approve: input.approve,
      p_reason: input.reason?.trim() || null,
    }),
  );
}

// お店の一覧（S-21）。特典の数はお店の本人だけが読めるので、ここでは 0
export async function getShops(): Promise<ShopDetail[]> {
  if (USE_MOCK) return mockApi.getShops();
  const data = await rows(
    getSupabase().from('shops').select(SHOP_COLUMNS).order('created_at', { ascending: false }),
  );
  return (data as unknown as Parameters<typeof toShopDetail>[0][]).map((r) =>
    toShopDetail(r, { rewardCount: 0, usedRewardCount: 0 }),
  );
}

async function setStatus(target: string, id: string, value: string, reason?: string) {
  await call(
    getSupabase().rpc('admin_set_status', {
      p_target: target,
      p_id: id,
      p_value: value,
      p_reason: reason?.trim() || null,
    }),
  );
}

// お店の停止・再開（BR-29）。お店を止めると、キャンペーンも止まる
export async function setShopStatus(
  shopId: string,
  status: 'active' | 'suspended',
  reason?: string,
): Promise<void> {
  if (USE_MOCK) return mockApi.setShopStatus(shopId, status, reason);
  await setStatus('shop', shopId, status, reason);
}

// キャンペーンの停止・再開（BR-27、BR-29）
export async function setCampaignStatus(
  campaignId: string,
  status: 'active' | 'stopped',
  reason?: string,
): Promise<void> {
  if (USE_MOCK) return mockApi.setCampaignStatus(campaignId, status, reason);
  await setStatus('campaign', campaignId, status, reason);
}

// すべての投稿（非表示を含む）を新しい順に20件ずつ（S-21）
export async function getAllSpotPosts({
  page,
}: {
  page: number;
}): Promise<{ items: SpotPost[]; hasMore: boolean }> {
  if (USE_MOCK) return mockApi.getAllSpotPosts({ page });
  const from = page * PAGE_SIZE;
  const data = await rows(
    getSupabase()
      .from('spot_posts')
      .select(POST_COLUMNS)
      .order('created_at', { ascending: false })
      .order('id')
      .range(from, from + PAGE_SIZE),
  );
  const posts = (data as unknown as SpotPostRow[]).map((r) => toSpotPost(r, spotImageUrlOf));
  return { items: posts.slice(0, PAGE_SIZE), hasMore: posts.length > PAGE_SIZE };
}

// 投稿の非表示・再表示（BR-29）
export async function setSpotPostHidden(
  postId: string,
  hidden: boolean,
  reason?: string,
): Promise<void> {
  if (USE_MOCK) return mockApi.setSpotPostHidden(postId, hidden, reason);
  await setStatus('post', postId, hidden ? 'hidden' : 'shown', reason);
}

// スポットの使用中止（BR-29）。再開はできない
export async function setSpotActive(
  spotId: number,
  active: boolean,
  reason?: string,
): Promise<void> {
  if (USE_MOCK) return mockApi.setSpotActive(spotId, active, reason);
  await setStatus('spot', String(spotId), active ? 'active' : 'inactive', reason);
}
