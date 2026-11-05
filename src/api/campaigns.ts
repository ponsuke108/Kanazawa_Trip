// （v11 第3段階）キャンペーンと特典（要件定義書 10.3、BR-27、BR-28）
import { USE_MOCK } from '@/api/config';
import { ApiError } from '@/api/errors';
import {
  isRewardValid,
  rewardExpiresAt,
  toCampaign,
  toCampaignColumns,
  type CampaignRow,
} from '@/api/mappers';
import { mockApi } from '@/api/mock/mockApi';
import {
  call,
  campaignImageUrlOf,
  currentUserId,
  isUuid,
  maybeOne,
  one,
  rows,
} from '@/api/supabaseCall';
import { CAMPAIGN_IMAGES_BUCKET, getSupabase } from '@/lib/supabase';
import type { Campaign, CampaignInput, CampaignReward } from '@/types/models';

export const CAMPAIGN_COLUMNS =
  'id, shop_id, title, benefit, notice, description, image_path, starts_on, ends_on, status, shop:shops(name)';

// キャンペーンを1件読む（なければ null）
export async function fetchCampaign(campaignId: string): Promise<Campaign | null> {
  const row = await maybeOne(
    getSupabase().from('campaigns').select(CAMPAIGN_COLUMNS).eq('id', campaignId).maybeSingle(),
  );
  return row ? toCampaign(row as unknown as CampaignRow, campaignImageUrlOf) : null;
}

// RPC check_campaign_eligibility（BR-28）。位置は保存しない
export async function checkCampaignEligibility(input: {
  spotId: number;
  lat: number;
  lng: number;
  accuracy: number;
}): Promise<{ eligible: boolean; distanceM: number | null; campaign: Campaign | null }> {
  if (USE_MOCK) return mockApi.checkCampaignEligibility(input);
  const result = await one(
    getSupabase().rpc('check_campaign_eligibility', {
      p_spot_id: input.spotId,
      p_lat: input.lat,
      p_lng: input.lng,
      p_accuracy: input.accuracy,
    }),
  );
  const first = result[0];
  if (!first) return { eligible: false, distanceM: null, campaign: null };
  const campaign = first.campaign_id ? await fetchCampaign(first.campaign_id) : null;
  return { eligible: first.eligible, distanceM: first.distance_m, campaign };
}

// 本人の特典（S-23）。見つからなければ null
export async function getReward(rewardId: string): Promise<CampaignReward | null> {
  if (USE_MOCK) return mockApi.getReward(rewardId);
  if (!isUuid(rewardId)) return null;
  const userId = await currentUserId();
  const row = await maybeOne(
    getSupabase()
      .from('campaign_rewards')
      .select(`id, issued_at, used_at, campaign:campaigns(${CAMPAIGN_COLUMNS})`)
      .eq('id', rewardId)
      .eq('user_id', userId)
      .maybeSingle(),
  );
  if (!row || !row.campaign) return null;
  return {
    id: row.id,
    campaign: toCampaign(row.campaign as unknown as CampaignRow, campaignImageUrlOf),
    issuedAt: row.issued_at,
    expiresAt: rewardExpiresAt(row.issued_at),
    usedAt: row.used_at,
  };
}

// RPC use_reward（BR-28）。受け取った日のうちで未使用でなければ CAMPAIGN_NOT_ELIGIBLE
export async function useReward(rewardId: string): Promise<void> {
  if (USE_MOCK) return mockApi.useReward(rewardId);
  await call(getSupabase().rpc('use_reward', { p_reward_id: rewardId }));
}

// 本人の有効な特典の id を、投稿の id ごとに返す（getMySpotPosts で使う）
export async function validRewardIdsByPost(userId: string): Promise<Map<string, string>> {
  const data = await rows(
    getSupabase()
      .from('campaign_rewards')
      .select('id, post_id, issued_at, used_at')
      .eq('user_id', userId)
      .is('used_at', null),
  );
  const map = new Map<string, string>();
  for (const r of data) if (r.post_id && isRewardValid(r)) map.set(r.post_id, r.id);
  return map;
}

// 自分のお店の id（キャンペーンを作るとき）
async function myShopId(): Promise<string> {
  const userId = await currentUserId();
  const shop = await maybeOne(
    getSupabase().from('shops').select('id').eq('owner_id', userId).maybeSingle(),
  );
  if (!shop) throw new ApiError('FORBIDDEN');
  return shop.id;
}

// campaigns に追加・更新（S-20、BR-27）。お店が同時に行えるのは1つ（もう1つあれば LIMIT_REACHED）
export async function saveCampaign(input: CampaignInput): Promise<{ id: string }> {
  if (USE_MOCK) return mockApi.saveCampaign(input);
  const supabase = getSupabase();
  const columns = toCampaignColumns(input);
  try {
    if (input.id === null) {
      const shopId = await myShopId();
      const row = await one(
        supabase
          .from('campaigns')
          .insert({ ...columns, shop_id: shopId, status: 'active' })
          .select('id')
          .single(),
      );
      return { id: row.id };
    }
    const data = await rows(
      supabase.from('campaigns').update(columns).eq('id', input.id).select('id'),
    );
    if (data.length === 0) throw new ApiError('FORBIDDEN');
    return { id: input.id };
  } catch (e) {
    throw toLimitError(e);
  }
}

// キャンペーンを終える（status = ended）
export async function endCampaign(campaignId: string): Promise<void> {
  if (USE_MOCK) return mockApi.endCampaign(campaignId);
  const data = await rows(
    getSupabase().from('campaigns').update({ status: 'ended' }).eq('id', campaignId).select('id'),
  );
  if (data.length === 0) throw new ApiError('FORBIDDEN');
}

// 一意の制約（1つのお店で active は1つ）に当たったら LIMIT_REACHED にする
function toLimitError(e: unknown): unknown {
  if (e instanceof ApiError && /campaigns_one_active|duplicate key/.test(e.message)) {
    return new ApiError('LIMIT_REACHED');
  }
  return e;
}

// 変えるときに今の画像を残すため、表示用の URL から Storage のパスに戻す（Campaign は URL だけを持つ）
export function campaignImagePath(campaign: Campaign): string | null {
  if (USE_MOCK) return mockApi.campaignImagePath(campaign);
  if (!campaign.imageUrl) return null;
  const marker = `/${CAMPAIGN_IMAGES_BUCKET}/`;
  const i = campaign.imageUrl.indexOf(marker);
  return i >= 0
    ? decodeURIComponent(campaign.imageUrl.slice(i + marker.length).split('?')[0] ?? '')
    : null;
}

// 申請の最初のキャンペーン（下書き）の画像のパスを、表示用の URL にする（S-22）
export function campaignImageUrl(path: string | null): string | null {
  if (USE_MOCK) return mockApi.campaignImageUrl(path);
  return path ? campaignImageUrlOf(path) : null;
}
